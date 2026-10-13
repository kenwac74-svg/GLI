import type { Asset } from "../lib/assets.ts";
import { mapListingRowToAsset } from "./assets-repository.ts";
import type { D1DatabaseLike } from "./user-workflows.ts";
import { createD1AssetReferenceRepository } from "./asset-reference-repository.ts";

// Provider-neutral contract; D1 SQL stays below this boundary for the AWS port.
// TODO(P53): Add optional raw-page snapshots and prefetched image objects through
// a provider-neutral store (R2 now, S3 on AWS). Persist image SHA-256/version and
// source/check timestamps; revalidate on recollection, hash downloaded bytes,
// and replace the active reference only after a changed object is saved safely.
// Identical content reuses the cached object; a failed refresh keeps the old one.
// Current save retains normalized fields/image URLs, not image files or chats.
export type DiscoveryRepository = {
  save(assets: readonly Asset[], observedAt: string): Promise<Asset[]>;
  list(countries?: readonly string[]): Promise<Asset[]>;
  get(id: string): Promise<Asset | null>;
};
type Row = { payload_json: string };
export class DiscoveryPersistenceError extends Error {
  readonly savedAssets: Asset[];
  constructor(savedAssets: Asset[]) { super("Discovery persistence failed"); this.savedAssets = savedAssets; }
}

export function validateDiscoveredAsset(input: unknown): Asset {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Invalid discovery record");
  const a = input as Asset;
  if (!a.sourceName?.trim() || !a.sourceUrl || a.isGliDirect || a.trustStatus === "VERIFIED") {
    throw new TypeError("Discovery requires provenance and cannot claim GLI verification");
  }
  const row = mapListingRowToAsset({
    ...a, publicId: a.id, status: "ACTIVE", transactionType: a.transaction,
    // Empty source dates mean unknown, not the collection date.
    updatedAt: a.updatedAt === "" ? "1970-01-01T00:00:00.000Z" : a.updatedAt,
    priceMinor: minor(a.price), areaSqmX100: minor(a.areaSqm),
    imageUrl: a.image, sourceSlug: "discovery", sourceUrl: a.sourceUrl,
  });
  // Only the public contract is retained; no caller's private/arbitrary fields.
  return { ...row, sourceName: a.sourceName.trim(), sourceUrl: new URL(a.sourceUrl).toString(),
    updatedAt: a.updatedAt === "" ? "" : row.updatedAt,
    ...(a.images ? { images: a.images.map(safeImage) } : {}),
    ...(a.sourceObservedAt ? { sourceObservedAt: timestamp(a.sourceObservedAt) } : {}),
    ...(a.sourcePublishedAt ? { sourcePublishedAt: timestamp(a.sourcePublishedAt) } : {}),
    ...(a.sourceUpdatedAt ? { sourceUpdatedAt: timestamp(a.sourceUpdatedAt) } : {}),
    ...publicDetails(a),
    ...(a.maxPrice !== undefined ? { maxPrice: minor(a.maxPrice) / 100 } : {}) };
}

export function createD1DiscoveryRepository(database: D1DatabaseLike): DiscoveryRepository {
  return {
    async save(assets, observedAt) {
      if (assets.length > 150) throw new RangeError("Discovery batch exceeds 150 records");
      timestamp(observedAt);
      // Validate the entire input before writing anything; bounded atomic batches.
      const validated = assets.map(validateDiscoveredAsset);
      const unique = new Map(validated.map(asset => [`${asset.sourceUrl}:${asset.transaction}`, asset]));
      if (!unique.size) return [];
      const reference = createD1AssetReferenceRepository(database);
      const saved: Asset[] = [];
      // Bounded concurrency; each asset's latest/version/mirror is atomic.
      const values = [...unique.values()];
      for (let offset = 0; offset < values.length; offset += 20) {
        const results = await Promise.allSettled(values.slice(offset, offset + 20).map(asset =>
          reference.upsertSnapshot(asset, asset.sourceObservedAt ?? observedAt, "discovery")));
        for (const result of results) if (result.status === "fulfilled") saved.push(result.value.asset);
        if (results.some(result => result.status === "rejected")) throw new DiscoveryPersistenceError(saved);
      }
      return saved;
    },
    async list(countries = []) {
      if (countries.length > 7) throw new RangeError("Too many countries");
      const country = countries.length ? `AND d.country IN (${countries.map(() => "?").join(",")})` : "";
      const result = await database.prepare(`SELECT d.payload_json FROM discovered_assets d
        LEFT JOIN asset_references r ON r.public_id=d.public_id
        WHERE COALESCE(r.source_state,'present')!='removed' AND COALESCE(r.transaction_state,'unknown')!='completed' ${country}
        ORDER BY d.observed_at DESC, d.public_id ASC LIMIT 100`).bind(...countries).all<Row>();
      if (result.success === false) throw new Error("Discovery read failed");
      return (result.results ?? []).map(decode);
    },
    async get(id) {
      const row = await database.prepare("SELECT payload_json FROM discovered_assets WHERE public_id = ?").bind(id).first<Row>();
      return row ? decode(row) : null;
    },
  };
}

function decode(row: Row): Asset {
  const asset = JSON.parse(row.payload_json) as Asset;
  // Legacy KH collector used observation time as source update time. Correct
  // its known provenance on read without rewriting the stored historical record.
  if (asset.id.startsWith("GLI-KH-LIVE-") && !asset.sourceUpdatedAt) asset.updatedAt = "";
  return validateDiscoveredAsset(asset);
}

function publicDetails(asset: Asset): Partial<Asset> {
  const details: Partial<Asset> = {};
  if (asset.priceUsdReference !== undefined) {
    details.priceUsdReference = {
      amount: minor(asset.priceUsdReference.amount) / 100,
      provider: publicText(asset.priceUsdReference.provider),
      asOf: timestamp(asset.priceUsdReference.asOf),
    };
  }
  for (const key of ["categoryLabel", "offerLabel", "priceLabel", "cardMeta", "documentDateLabel", "publicationBasis"] as const) {
    if (asset[key] !== undefined) details[key] = publicText(asset[key]);
  }
  if (asset.assetCategory !== undefined) {
    if (!["residential", "commercial", "leisure", "project"].includes(asset.assetCategory)) throw new TypeError("Invalid category");
    details.assetCategory = asset.assetCategory;
  }
  if (asset.detailFacts !== undefined) {
    if (!Array.isArray(asset.detailFacts) || asset.detailFacts.length > 50) throw new TypeError("Invalid detail facts");
    details.detailFacts = asset.detailFacts.map(fact => ({ label: publicText(fact.label), value: publicText(fact.value) }));
  }
  if (asset.publicResources !== undefined) {
    if (!Array.isArray(asset.publicResources) || asset.publicResources.length > 20) throw new TypeError("Invalid public resources");
    details.publicResources = asset.publicResources.map(resource => {
      if (!["website", "video", "article"].includes(resource.type)) throw new TypeError("Invalid resource type");
      return { label: publicText(resource.label), type: resource.type, url: safeImage(resource.url) };
    });
  }
  return details;
}
function publicText(value: string): string {
  if (typeof value !== "string" || !value.trim() || value.length > 4000) throw new TypeError("Invalid public text");
  return value;
}
function safeImage(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) throw new TypeError("Invalid discovery image");
  return url.toString();
}
function minor(value: number): number {
  const result = Math.round(value * 100);
  if (!Number.isFinite(value) || value < 0 || !Number.isSafeInteger(result)) throw new TypeError("Invalid discovery amount");
  return result;
}
function timestamp(value: string): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new TypeError("Invalid observed timestamp");
  return new Date(value).toISOString();
}
