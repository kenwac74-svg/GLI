import { createD1AssetReferenceRepository } from "../db/asset-reference-repository.ts";
import { createD1AssetFavoritesRepository, readRetainedListing } from "../db/asset-favorites-repository.ts";
import type { D1DatabaseLike } from "../db/user-workflows.ts";
import { getAsset } from "./assets-data.ts";
import { assets } from "./assets.ts";
import { partnerAssets } from "./partner-assets.ts";
import { findCuratedOpportunity } from "./curated-opportunities.ts";
import { validAssetId } from "./asset-content.ts";

// IDs identify sources; client-supplied property facts are never accepted.
export async function ensureAssetReference(database:D1DatabaseLike,id:string,userId?:string) {
  validAssetId(id);
  const repo=createD1AssetReferenceRepository(database);
  const existing=await repo.get(id);
  if (existing) {
    if(existing.kind==="listing" && (await readRetainedListing(database,id))?.status!=="ACTIVE"
      && (!userId || !await createD1AssetFavoritesRepository(database).contains(userId,id))) throw new Error("Asset not found");
    return existing;
  }
  if (id.startsWith("fixture:")) {
    const original=id.slice(8);
    const fixture=assets.find(asset=>asset.id===original) ?? partnerAssets.find(asset=>asset.id===original) ?? findCuratedOpportunity(original);
    if (!fixture) throw new Error("Asset not found");
    await repo.upsertSnapshot({...fixture,id},new Date().toISOString(),"fixture");
  } else {
    const listing=await readRetainedListing(database,id);
    if (listing) {
      if (listing.status!=="ACTIVE") throw new Error("Listing is not active");
      await repo.upsertSnapshot(listing.asset,new Date().toISOString(),"listing");
    } else {
      const {asset}=await getAsset(id);
      if (!asset || !asset.sourceUrl || !asset.sourceName || asset.isGliDirect) throw new Error("Asset not found");
      await repo.upsertSnapshot(asset,asset.sourceObservedAt ?? new Date().toISOString(),"discovery");
    }
  }
  const saved=await repo.get(id);
  if (!saved) throw new Error("Asset reference unavailable");
  return saved;
}
