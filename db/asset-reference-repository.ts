import type { Asset } from "../lib/assets.ts";
import { assetContentHash, mergeAssetSnapshot, validAssetId } from "../lib/asset-content.ts";
import type { D1DatabaseLike, D1StatementLike } from "./user-workflows.ts";
import { confirmedIdentityGroup, type IdentityEvidence } from "../lib/asset-identity.ts";

export type AssetKind = "listing" | "discovery" | "fixture";
export type AssetReference = {
  publicId: string; kind: AssetKind; asset: Asset; firstSeenAt: string; checkedAt: string;
  sourceState: "present" | "removed" | "check_failed";
  transactionState: "unknown" | "available" | "completed"; identityGroup: string | null;
  favoriteSavedAt?: number;
  favoriteReferenceIds?: string[];
  publicationState?: "active" | "archived";
};
export type PriceHistoryEntry = {
  sourceUrl: string; currency: string; transaction: "sale" | "rent"; price: number;
  maxPrice?: number; observedAt: string; sourceUpdatedAt?: string;
};
type Row = { public_id: string; kind: AssetKind; payload_json: string; content_hash: string;
  first_seen_at: number; checked_at: number; source_state: AssetReference["sourceState"];
  transaction_state: AssetReference["transactionState"]; identity_group: string | null; identity_evidence_json:string|null };
const decode = (row: Row): AssetReference => ({ publicId: row.public_id, kind: row.kind,
  asset: JSON.parse(row.payload_json), firstSeenAt: new Date(row.first_seen_at).toISOString(),
  checkedAt: new Date(row.checked_at).toISOString(), sourceState: row.source_state,
  transactionState: row.transaction_state, identityGroup: row.identity_group });
const time = (value: string) => {
  const n = Date.parse(value);
  if (!Number.isFinite(n)) throw new TypeError("Invalid observation time");
  return n;
};
export function createD1AssetReferenceRepository(database: D1DatabaseLike) {
  async function getRow(id: string) {
    return database.prepare("SELECT * FROM asset_references WHERE public_id=?").bind(validAssetId(id)).first<Row>();
  }
  async function write(asset: Asset, at: number, kind: AssetKind) {
    if (!database.batch) throw new Error("Retention requires atomic batches");
    for (let attempt = 0; attempt < 3; attempt++) {
      const old = await getRow(asset.id);
      if (old && old.kind !== kind) throw new TypeError("Asset kind mismatch");
      if (old && at < old.checked_at) return { asset: JSON.parse(old.payload_json) as Asset, changed: false, versionId: null };
      const merged = mergeAssetSnapshot(old ? JSON.parse(old.payload_json) : null, asset);
      merged.id = asset.id;
      if (kind === "discovery") merged.sourceObservedAt = new Date(at).toISOString();
      const hash = await assetContentHash(merged);
      let group=old?.identity_group ?? null;
      let evidence=old?.identity_evidence_json ?? null;
      if(group){
        try{
          if(!evidence || await confirmedIdentityGroup([merged,merged],JSON.parse(evidence))!==group){group=null;evidence=null;}
        }catch{group=null;evidence=null;}
      }
      const statements: D1StatementLike[] = [database.prepare(`
        INSERT INTO asset_references(public_id,kind,payload_json,content_hash,first_seen_at,checked_at)
        VALUES(?,?,?,?,?,?) ON CONFLICT(public_id) DO UPDATE SET
        payload_json=excluded.payload_json, content_hash=excluded.content_hash, checked_at=excluded.checked_at,
        identity_group=?,identity_evidence_json=?
        WHERE asset_references.content_hash=? AND asset_references.checked_at=?
        AND asset_references.identity_group IS ? AND asset_references.identity_evidence_json IS ?
        RETURNING *`).bind(asset.id,kind,JSON.stringify(merged),hash,at,at,group,evidence,
          old?.content_hash ?? "",old?.checked_at ?? -1,old?.identity_group ?? null,old?.identity_evidence_json ?? null)];
      if(old?.identity_group && !group) statements.push(database.prepare(`
        INSERT INTO audit_logs(actor_user_id,action,resource_type,resource_id,before_json,after_json,created_at)
        SELECT NULL,'ASSET_IDENTITY_INVALIDATED','ASSET_REFERENCE',?,?,NULL,? WHERE changes()>0`)
        .bind(asset.id,JSON.stringify({groupId:old.identity_group,evidence:old.identity_evidence_json}),at));
      if (kind === "discovery") statements.push(database.prepare(`
        INSERT INTO discovered_assets(public_id,source_url,transaction_type,country,payload_json,first_seen_at,observed_at)
        SELECT public_id,json_extract(payload_json,'$.sourceUrl'),json_extract(payload_json,'$.transaction'),
        json_extract(payload_json,'$.country'),payload_json,first_seen_at,checked_at
        FROM asset_references WHERE public_id=?
        ON CONFLICT(source_url,transaction_type) DO UPDATE SET payload_json=excluded.payload_json,
        country=excluded.country, observed_at=MAX(discovered_assets.observed_at,excluded.observed_at)
        WHERE excluded.observed_at>=discovered_assets.observed_at`).bind(asset.id));
      const result = await database.batch<Row>(statements);
      if (result.some(r => r.success === false)) throw new Error("Retention write failed");
      const saved = result[0].results?.[0];
      if (!saved) continue; // Re-read and re-merge after a concurrent winner.
      const changed = !old || old.content_hash !== hash;
      const version = changed ? await database.prepare("SELECT id FROM asset_versions WHERE asset_public_id=? AND content_hash=? AND observed_at=? ORDER BY rowid DESC LIMIT 1")
        .bind(asset.id,hash,saved.checked_at).first<{id:string}>() : null;
      return { asset: decode(saved).asset, changed, versionId: version?.id ?? null };
    }
    throw new Error("Concurrent asset update; retry required");
  }
  return {
    async get(id: string): Promise<AssetReference | null> { const row=await getRow(id); return row ? decode(row) : null; },
    async upsertSnapshot(asset: Asset, observedAt: string, kind: AssetKind) {
      validAssetId(asset.id);
      if (!["listing","discovery","fixture"].includes(kind)) throw new TypeError("Invalid asset kind");
      const at=time(observedAt);
      if (kind === "discovery") {
        const legacy = await database.prepare("SELECT public_id,payload_json,observed_at FROM discovered_assets WHERE source_url=? AND transaction_type=?")
          .bind(asset.sourceUrl,asset.transaction).first<{public_id:string;payload_json:string;observed_at:number}>();
        if (legacy) {
          asset = {...asset,id:legacy.public_id};
          if (!await getRow(asset.id)) await write(JSON.parse(legacy.payload_json),legacy.observed_at,kind);
        }
      }
      return write(asset,at,kind);
    },
    async priceHistory(id: string): Promise<PriceHistoryEntry[]> {
      const ref=await getRow(id);
      if (!ref) return [];
      const result=await database.prepare(`SELECT v.payload_json,v.observed_at FROM asset_versions v
        JOIN asset_references r ON r.public_id=v.asset_public_id
        WHERE r.public_id=? OR (? IS NOT NULL AND r.identity_group=?) ORDER BY v.observed_at DESC,v.rowid DESC LIMIT 500`)
        .bind(validAssetId(id),ref.identity_group,ref.identity_group).all<{payload_json:string;observed_at:number}>();
      const entries: PriceHistoryEntry[]=[];
      const lastBySource = new Map<string, PriceHistoryEntry>();
      for (const row of [...(result.results ?? [])].reverse()) {
        const asset=JSON.parse(row.payload_json) as Asset;
        const key=JSON.stringify([asset.sourceUrl,asset.transaction,asset.currency]);
        const previous=lastBySource.get(key);
        if (!(asset.price > 0) || (previous && previous.price===asset.price && previous.maxPrice===asset.maxPrice
          && previous.currency===asset.currency && previous.transaction===asset.transaction && previous.sourceUrl===(asset.sourceUrl ?? ""))) continue;
        const entry={sourceUrl:asset.sourceUrl ?? "",currency:asset.currency,transaction:asset.transaction,
          price:asset.price,...(asset.maxPrice !== undefined ? {maxPrice:asset.maxPrice}:{}),
          observedAt:new Date(row.observed_at).toISOString(),...(asset.sourceUpdatedAt ? {sourceUpdatedAt:asset.sourceUpdatedAt}:{})};
        entries.push(entry); lastBySource.set(key,entry);
      }
      return entries;
    },
    async linkConfirmedDuplicates(ids: string[], evidence: IdentityEvidence) {
      const unique=[...new Set(ids.map(validAssetId))];
      const rows=await Promise.all(unique.map(getRow));
      if (rows.some(row=>!row)) throw new Error("Asset not found");
      const existing=rows as Row[];
      const groupId=await confirmedIdentityGroup(existing.map(row=>JSON.parse(row.payload_json)),evidence);
      if (existing.some(row=>row.identity_group && row.identity_group!==groupId)) throw new Error("Conflicting identity group");
      const match=existing.map(()=>"(public_id=? AND content_hash=? AND (identity_group IS NULL OR identity_group=?))").join(" OR ");
      const args=existing.flatMap(row=>[row.public_id,row.content_hash,groupId]);
      if(!database.batch)throw new Error("Identity linking requires atomic batches");
      const linked=await database.batch<{public_id:string}>([database.prepare(`UPDATE asset_references SET identity_group=?,identity_evidence_json=?
        WHERE public_id IN (${unique.map(()=>"?").join(",")}) AND
        (SELECT count(*) FROM asset_references WHERE ${match})=? RETURNING public_id`)
        .bind(groupId,JSON.stringify(evidence),...unique,...args,unique.length),
        database.prepare(`INSERT INTO audit_logs(actor_user_id,action,resource_type,resource_id,after_json,created_at)
          SELECT NULL,'ASSET_IDENTITY_LINKED','ASSET_GROUP',?,?,? WHERE changes()>0`)
          .bind(groupId,JSON.stringify({assetIds:unique,evidence}),Date.now())]);
      if(linked.some(result=>result.success===false) || linked[0].results?.length!==unique.length) throw new Error("Concurrent identity change; retry required");
      return {groupId};
    },
    async markStatus(id: string, state: {sourceState?:AssetReference["sourceState"];transactionState?:AssetReference["transactionState"]}, observedAt: string) {
      const old=await getRow(id);
      if (!old) throw new Error("Asset not found");
      if (state.sourceState && !["present","removed","check_failed"].includes(state.sourceState)) throw new TypeError("Invalid source state");
      if (state.transactionState && !["unknown","available","completed"].includes(state.transactionState)) throw new TypeError("Invalid transaction state");
      return database.prepare("UPDATE asset_references SET source_state=?,transaction_state=?,checked_at=? WHERE public_id=? AND checked_at<=? RETURNING public_id")
        .bind(state.sourceState ?? old.source_state,state.transactionState ?? old.transaction_state,time(observedAt),id,time(observedAt)).all();
    },
  };
}
