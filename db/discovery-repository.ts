import type { Asset } from "../lib/assets.ts";
import { mapListingRowToAsset } from "./assets-repository.ts";
import type { D1DatabaseLike } from "./user-workflows.ts";

// Provider-neutral contract; D1 SQL stays below this boundary for the AWS port.
export type DiscoveryRepository = {
  save(assets: readonly Asset[], observedAt: string): Promise<Asset[]>;
  list(countries?: readonly string[]): Promise<Asset[]>;
  get(id: string): Promise<Asset | null>;
};
type Row = { payload_json: string };

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
      if (!database.batch) throw new Error("Discovery storage requires atomic batch support");
      const results = await database.batch<Row>([...unique.values()].map(asset => {
        const time = Date.parse(asset.sourceObservedAt ?? observedAt);
        return database.prepare(`
        INSERT INTO discovered_assets
          (public_id, source_url, transaction_type, country, payload_json, first_seen_at, observed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(source_url, transaction_type) DO UPDATE SET
          country = CASE WHEN excluded.observed_at >= discovered_assets.observed_at THEN excluded.country ELSE discovered_assets.country END,
          payload_json = CASE WHEN excluded.observed_at >= discovered_assets.observed_at
            THEN json_set(excluded.payload_json, '$.id', discovered_assets.public_id) ELSE discovered_assets.payload_json END,
          observed_at = MAX(excluded.observed_at, discovered_assets.observed_at)
        RETURNING payload_json
      `).bind(asset.id, asset.sourceUrl, asset.transaction, asset.country,
        JSON.stringify({ ...asset, sourceObservedAt: new Date(time).toISOString() }), time, time);
      }));
      if (results.some(result => result.success === false)) throw new Error("Discovery batch failed");
      return results.flatMap(result => (result.results ?? []).map(decode));
    },
    async list(countries = []) {
      if (countries.length > 7) throw new RangeError("Too many countries");
      const where = countries.length ? `WHERE country IN (${countries.map(() => "?").join(",")})` : "";
      const result = await database.prepare(`SELECT payload_json FROM discovered_assets ${where}
        ORDER BY observed_at DESC, public_id ASC LIMIT 100`).bind(...countries).all<Row>();
      if (result.success === false) throw new Error("Discovery read failed");
      return (result.results ?? []).map(decode);
    },
    async get(id) {
      const row = await database.prepare("SELECT payload_json FROM discovered_assets WHERE public_id = ?").bind(id).first<Row>();
      return row ? decode(row) : null;
    },
  };
}

function decode(row: Row): Asset { return validateDiscoveredAsset(JSON.parse(row.payload_json)); }
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
