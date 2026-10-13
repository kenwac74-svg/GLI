import type { Asset } from "./assets.ts";

const fields: (keyof Asset)[] = ["id","country","countryCode","city","district","transaction","propertyType",
  "assetCategory","categoryLabel","offerLabel","priceLabel","cardMeta","detailFacts","bedrooms","bathrooms",
  "title","price","maxPrice","currency","priceUsdReference","sourceObservedAt","sourcePublishedAt","sourceUpdatedAt",
  "areaSqm","image","images","publicResources","summary","trustScore","trustStatus","isGliDirect","originLabel",
  "documentDateLabel","publicationBasis","sourceName","sourceUrl","updatedAt","strengths","checks"];
const volatile = new Set(["sourceObservedAt","updatedAt","sourceUpdatedAt","priceUsdReference"]);

export function mergeAssetSnapshot(previous: Asset | null, incoming: Asset): Asset {
  const copy: Record<string, unknown> = previous ? { ...previous } : {};
  for (const key of fields) {
    const value = incoming[key];
    if (value === undefined) continue;
    if (previous && (value === "" || value === null || (Array.isArray(value) && !value.length))) continue;
    if (key === "summary" && previous?.summary && incoming.summary === incoming.title) continue;
    if (key === "detailFacts" && incoming.detailFacts && previous?.detailFacts) {
      const merged=new Map(previous.detailFacts.map(fact=>[fact.label.trim().toLowerCase(),fact]));
      for(const fact of incoming.detailFacts) merged.set(fact.label.trim().toLowerCase(),fact);
      copy.detailFacts=[...merged.values()]; continue;
    }
    if (key === "images" && incoming.images && previous?.images) {
      copy.images=[...new Set([...incoming.images,...previous.images])]; continue;
    }
    if (key === "publicResources" && incoming.publicResources && previous?.publicResources) {
      const merged=new Map(previous.publicResources.map(resource=>[`${resource.type}:${resource.label}`,resource]));
      for(const resource of incoming.publicResources) merged.set(`${resource.type}:${resource.label}`,resource);
      copy.publicResources=[...merged.values()]; continue;
    }
    copy[key] = value;
  }
  // An absent current FX reference must not retain a stale conversion.
  if (incoming.priceUsdReference === undefined) delete copy.priceUsdReference;
  return copy as Asset;
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value)
    .sort(([a],[b]) => a.localeCompare(b)).map(([key,item]) => [key, canonical(item)]));
  return value;
}
export async function assetContentHash(asset: Asset): Promise<string> {
  const content = Object.fromEntries(fields.filter(key => !volatile.has(key) && asset[key] !== undefined)
    .map(key => [key,asset[key]]));
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(canonical(content))));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2,"0")).join("");
}
export function validAssetId(id: string): string {
  if (typeof id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(id)) throw new TypeError("Invalid asset ID");
  return id;
}
