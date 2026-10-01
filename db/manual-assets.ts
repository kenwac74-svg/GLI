import { createHash } from "node:crypto";
import { normalizeApprovedFixture } from "../ingestion/normalize.ts";
import type { D1DatabaseLike } from "./user-workflows.ts";

// GS-021 / P51: draft-only repository. No collector, AI call or public publishing.
export function normalizeManualAsset(input: unknown, now = Date.now()) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Invalid manual asset");
  const a = input as Record<string, unknown>;
  const normalized = normalizeApprovedFixture({
    country: a.country, city: a.city, district: a.district || "조사 예정",
    transaction: a.transaction, propertyType: a.propertyType,
    title: a.title, summary: a.summary, price: a.price, currency: a.currency,
    areaSqm: a.areaSqm, bedrooms: a.bedrooms ?? 0, bathrooms: a.bathrooms ?? 0,
    imageUrl: a.imageUrl || null, sourceExternalKey: "manual-input",
    // Internal normalization placeholder is removed below, never attribution.
    sourceUrl: a.sourceUrl || "https://glibiz.net/admin/manual",
    observedAt: new Date(now).toISOString(),
  });
  if (normalized.priceMinor <= 0) throw new RangeError("가격은 0보다 커야 합니다.");
  return { ...normalized, source: a.sourceUrl ? normalized.source : null,
    bedrooms: a.bedrooms == null ? null : normalized.bedrooms,
    bathrooms: a.bathrooms == null ? null : normalized.bathrooms };
}
export type ManualAssetPayload = ReturnType<typeof normalizeManualAsset>;
export type ManualAssetDraft = { id: string; actorUserId: string; status: "REVIEW_PENDING";
  payload: ManualAssetPayload; createdAt: number };
type Row = { id: string; actor_user_id: string; input_hash: string; payload_json: string; created_at: number };

export async function saveManualAsset(database: D1DatabaseLike, actor: string,
  requestKey: string, input: unknown, now = Date.now()): Promise<ManualAssetDraft> {
  await requireAdmin(database, actor);
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(requestKey)) throw new TypeError("Invalid request key");
  const payload = normalizeManualAsset(input, now);
  const inputHash = hash(JSON.stringify({ ...payload, observedAt: null }));
  const id = `manual_${hash(`${actor}:${requestKey}`).slice(0, 24)}`;
  if (!database.batch) throw new Error("Manual input requires atomic audit writes");
  const results = await database.batch([
    database.prepare(`INSERT INTO manual_asset_drafts(id, actor_user_id, input_hash, payload_json, created_at)
      VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`).bind(id, actor, inputHash, JSON.stringify(payload), now),
    database.prepare(`INSERT INTO audit_logs(actor_user_id, action, resource_type, resource_id, after_json, request_id, created_at)
      SELECT ?, 'MANUAL_ASSET_CREATED', 'MANUAL_ASSET_DRAFT', ?, ?, ?, ?
      WHERE NOT EXISTS(SELECT 1 FROM audit_logs WHERE action='MANUAL_ASSET_CREATED' AND resource_id=?)
        AND EXISTS(SELECT 1 FROM manual_asset_drafts WHERE id=? AND input_hash=?)`)
      .bind(actor, id, JSON.stringify({ status: "REVIEW_PENDING" }), requestKey, now, id, id, inputHash),
  ]);
  if (results.some(result => result.success === false)) throw new Error("Manual draft write failed");
  const saved = await database.prepare("SELECT * FROM manual_asset_drafts WHERE id=?").bind(id).first<Row>();
  if (!saved || saved.input_hash !== inputHash) throw new RangeError("같은 요청 번호로 다른 내용을 저장할 수 없습니다.");
  return decode(saved);
}
export async function listManualAssets(database: D1DatabaseLike, actor: string): Promise<ManualAssetDraft[]> {
  await requireAdmin(database, actor);
  const result = await database.prepare("SELECT * FROM manual_asset_drafts ORDER BY created_at DESC, id DESC LIMIT 20").all<Row>();
  return (result.results ?? []).map(decode);
}
async function requireAdmin(database: D1DatabaseLike, actor: string) {
  const user = await database.prepare("SELECT role, status FROM users WHERE id=?").bind(actor).first<{role: string; status: string}>();
  if (user?.role !== "ADMIN" || user.status !== "ACTIVE") throw new Error("Active administrator required");
}
function hash(value: string) { return createHash("sha256").update(value).digest("hex"); }
function decode(row: Row): ManualAssetDraft {
  return { id: row.id, actorUserId: row.actor_user_id, status: "REVIEW_PENDING",
    payload: JSON.parse(row.payload_json), createdAt: row.created_at };
}
