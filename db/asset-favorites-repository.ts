import type { D1DatabaseLike, D1StatementLike, DashboardFavorite } from "./user-workflows.ts";
import { mapListingRowToAsset } from "./assets-repository.ts";
import { getMembershipAccess, MembershipLimitError } from "./membership-entitlements.ts";
import { createD1AssetReferenceRepository, type AssetReference } from "./asset-reference-repository.ts";
import { validAssetId } from "../lib/asset-content.ts";
import type { Asset } from "../lib/assets.ts";

export async function readRetainedListing(database: D1DatabaseLike, id: string): Promise<{asset:Asset;status:string} | null> {
  const row=await database.prepare(`SELECT l.public_id AS publicId,l.country,l.city,l.district,l.transaction_type AS transactionType,
    l.property_type AS propertyType,l.title,l.summary,l.price_minor AS priceMinor,l.currency,l.area_sqm_x100 AS areaSqmX100,
    l.bedrooms,l.bathrooms,l.image_url AS imageUrl,l.is_gli_direct AS isGliDirect,l.updated_at AS updatedAt,l.status,
    COALESCE(t.score,0) AS trustScore,COALESCE(t.status,'PRELIMINARY') AS trustStatus,
    json_extract(v.normalized_payload_json,'$.strengths') AS strengthsJson,
    json_extract(v.normalized_payload_json,'$.checks') AS checksJson
    FROM listings l LEFT JOIN trust_score_runs t ON t.id=(SELECT id FROM trust_score_runs WHERE listing_id=l.id ORDER BY calculated_at DESC,id DESC LIMIT 1)
    LEFT JOIN listing_versions v ON v.id=(SELECT id FROM listing_versions WHERE listing_id=l.id ORDER BY observed_at DESC,id DESC LIMIT 1)
    WHERE l.public_id=?`).bind(validAssetId(id)).first<Record<string,unknown>>();
  return row ? {asset:mapListingRowToAsset({...row,status:"ACTIVE"}),status:String(row.status)} : null;
}

export function createD1AssetFavoritesRepository(database: D1DatabaseLike) {
  const refs=createD1AssetReferenceRepository(database);
  async function user(userId: string) {
    const row=await database.prepare("SELECT status FROM users WHERE id=?").bind(validAssetId(userId)).first<{status:string}>();
    if (!row || row.status!=="ACTIVE") throw new Error("User is not active");
  }
  async function syncLegacy(userId: string) {
    const legacy=await database.prepare(`SELECT l.public_id AS publicId,f.created_at AS createdAt FROM favorites f
      JOIN listings l ON l.id=f.listing_id WHERE f.user_id=?`).bind(userId).all<{publicId:string;createdAt:number}>();
    for (const favorite of legacy.results ?? []) {
      const listing=await readRetainedListing(database,favorite.publicId);
      if (!listing) continue;
      await refs.upsertSnapshot(listing.asset,new Date().toISOString(),"listing");
      // Re-check the legacy relationship at INSERT time; a concurrent removal wins.
      await database.prepare(`INSERT OR IGNORE INTO asset_favorite_refs(user_id,asset_public_id,created_at)
        SELECT f.user_id,l.public_id,f.created_at FROM favorites f JOIN listings l ON l.id=f.listing_id
        WHERE f.user_id=? AND l.public_id=?`).bind(userId,favorite.publicId).run();
    }
  }
  function audit(userId:string,id:string,action:string,requestId:string|null=null) {
    return database.prepare(`INSERT INTO audit_logs(actor_user_id,action,resource_type,resource_id,before_json,after_json,request_id,created_at)
      SELECT ?,?,'ASSET_REFERENCE',?,NULL,?,?,? WHERE changes()>0`)
      .bind(userId,action,id,JSON.stringify({userId,assetId:id}),requestId,Date.now());
  }
  function groupMatch() { return "(r.public_id=? OR (? IS NOT NULL AND r.identity_group=?))"; }
  return {
    async list(userId:string): Promise<AssetReference[]> {
      await user(userId); await syncLegacy(userId);
      const rows=await database.prepare(`SELECT r.*,f.created_at AS favoritedAt FROM asset_favorite_refs f
        JOIN asset_references r ON r.public_id=f.asset_public_id WHERE f.user_id=? ORDER BY f.created_at DESC,r.public_id`)
        .bind(userId).all<{public_id:string;identity_group:string|null;favoritedAt:number}>();
      const results: AssetReference[]=[];
      const seen=new Set<string>();
      for (const row of rows.results ?? []) {
        const key=row.identity_group ?? row.public_id;
        if (seen.has(key)) continue;
        seen.add(key);
        const ref=await refs.get(row.public_id);
        if (ref) {
          const aliases=ref.identityGroup ? await database.prepare("SELECT public_id FROM asset_references WHERE identity_group=?")
            .bind(ref.identityGroup).all<{public_id:string}>() : null;
          results.push({...ref,favoriteSavedAt:row.favoritedAt,
            ...(ref.kind==="listing" ? {publicationState:(await readRetainedListing(database,ref.publicId))?.status==="ACTIVE" ? "active" as const : "archived" as const}:{}),
            favoriteReferenceIds:aliases?.results?.map(x=>x.public_id) ?? [ref.publicId]});
        }
      }
      return results;
    },
    async contains(userId:string,id:string) {
      await user(userId); await syncLegacy(userId);
      const ref=await refs.get(id);
      if (!ref) return false;
      return Boolean(await database.prepare(`SELECT f.asset_public_id FROM asset_favorite_refs f
        JOIN asset_references r ON r.public_id=f.asset_public_id WHERE f.user_id=? AND ${groupMatch()} LIMIT 1`)
        .bind(userId,id,ref.identityGroup,ref.identityGroup).first());
    },
    async add(userId:string,id:string,requestId:string|null=null) {
      await user(userId); await syncLegacy(userId);
      const ref=await refs.get(validAssetId(id));
      if (!ref) throw new Error("Asset not found");
      const exists=await database.prepare(`SELECT f.asset_public_id FROM asset_favorite_refs f JOIN asset_references r ON r.public_id=f.asset_public_id
        WHERE f.user_id=? AND ${groupMatch()} LIMIT 1`).bind(userId,id,ref.identityGroup,ref.identityGroup).first();
      if (exists) return {created:false,listingPublicId:id};
      if (ref.kind==="listing" && (await readRetainedListing(database,id))?.status!=="ACTIVE") throw new Error("Asset not found");
      const access=await getMembershipAccess(database,userId);
      if (access.favoriteLimit!==null) {
        const count=await database.prepare(`SELECT count(DISTINCT COALESCE(r.identity_group,r.public_id)) AS n
          FROM asset_favorite_refs f JOIN asset_references r ON r.public_id=f.asset_public_id WHERE f.user_id=?`).bind(userId).first<{n:number}>();
        if ((count?.n ?? 0)>=access.favoriteLimit) throw new MembershipLimitError("FAVORITE_LIMIT_REACHED","관심 자산 한도에 도달했습니다.");
      }
      if (!database.batch) throw new Error("Favorites require atomic batches");
      const statements: D1StatementLike[]=[
        database.prepare("INSERT OR IGNORE INTO asset_favorite_refs(user_id,asset_public_id,created_at) VALUES(?,?,?) RETURNING asset_public_id").bind(userId,id,Date.now()),
        audit(userId,id,"FAVORITE_ADDED",requestId),
      ];
      if (ref.kind==="listing") statements.push(database.prepare(`INSERT OR IGNORE INTO favorites(user_id,listing_id,created_at)
        SELECT ?,id,? FROM listings WHERE public_id=?`).bind(userId,Date.now(),id));
      const result=await database.batch<{asset_public_id:string}>(statements);
      if (result.some(r=>r.success===false)) throw new Error("Favorite write failed");
      return {created:Boolean(result[0].results?.length),listingPublicId:id};
    },
    async remove(userId:string,id:string,requestId:string|null=null) {
      await user(userId); await syncLegacy(userId);
      const ref=await refs.get(validAssetId(id));
      if (!ref) return {removed:false,listingPublicId:id};
      if (!database.batch) throw new Error("Favorites require atomic batches");
      const result=await database.batch<{asset_public_id:string}>([
        database.prepare(`DELETE FROM asset_favorite_refs WHERE user_id=? AND asset_public_id IN
          (SELECT r.public_id FROM asset_references r WHERE ${groupMatch()}) RETURNING asset_public_id`)
          .bind(userId,id,ref.identityGroup,ref.identityGroup),
        audit(userId,id,"FAVORITE_REMOVED",requestId),
        database.prepare(`DELETE FROM favorites WHERE user_id=? AND listing_id IN
          (SELECT l.id FROM listings l JOIN asset_references r ON r.public_id=l.public_id WHERE ${groupMatch()})`)
          .bind(userId,id,ref.identityGroup,ref.identityGroup),
      ]);
      if (result.some(r=>r.success===false)) throw new Error("Favorite removal failed");
      return {removed:Boolean(result[0].results?.length),listingPublicId:id};
    },
  };
}
export function publicFavorite(ref: AssetReference): DashboardFavorite {
  const asset=ref.asset;
  const fixture=ref.kind==="fixture" && ref.publicId.startsWith("fixture:");
  return {publicId:fixture ? ref.publicId.slice(8) : ref.publicId,referenceId:ref.publicId,
    referenceIds:ref.favoriteReferenceIds ?? [ref.publicId],detailOrigin:fixture ? "fixture" : "search",country:asset.country,city:asset.city,district:asset.district,
    transactionType:asset.transaction,propertyType:asset.propertyType,title:asset.title,summary:asset.summary,
    priceMinor:Math.round(asset.price*100),currency:asset.currency,imageUrl:asset.image,trustScore:asset.trustScore,
    ...(asset.maxPrice!==undefined ? {maxPriceMinor:Math.round(asset.maxPrice*100)}:{}),priceLabel:asset.priceLabel,
    trustStatus:asset.trustStatus,favoritedAt:ref.favoriteSavedAt ?? 0,areaSqmX100:Math.round(asset.areaSqm*100),
    bedrooms:asset.bedrooms,bathrooms:asset.bathrooms,sourceState:ref.sourceState,transactionState:ref.transactionState,
    retained:ref.publicationState==="archived"};
}
