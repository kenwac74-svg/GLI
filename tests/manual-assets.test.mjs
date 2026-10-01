import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { normalizeManualAsset, saveManualAsset, listManualAssets } from "../db/manual-assets.ts";
const input = { country: "Vietnam", city: "Ho Chi Minh City", title: "Test condo residence",
  transaction: "sale", propertyType: "condo", price: 2000000000, currency: "VND",
  areaSqm: 32, summary: "A manually supplied listing for independent review." };
const now = Date.parse("2026-10-01T00:00:00Z");
function setup() {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync(new URL("../drizzle/0000_elite_adam_destine.sql", import.meta.url), "utf8").replaceAll("--> statement-breakpoint", ""));
  db.exec(readFileSync(new URL("../drizzle/0019_manual_asset_drafts.sql", import.meta.url), "utf8"));
  for (const [id, role, status] of [["admin", "ADMIN", "ACTIVE"], ["member", "MEMBER", "ACTIVE"], ["inactive", "ADMIN", "INACTIVE"]])
    db.prepare("INSERT INTO users(id,email,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?)").run(id, `${id}@example.com`, role, status, now, now);
  const adapter = { prepare(sql) { let args = []; return {
    bind(...values) { args = values; return this; },
    async first() { return db.prepare(sql).get(...args) ?? null; },
    async all() { return { results: db.prepare(sql).all(...args), success: true }; },
    async run() { return { success: true, meta: db.prepare(sql).run(...args) }; },
  }; }, async batch(statements) {
    db.exec("BEGIN"); try { const out = await Promise.all(statements.map(s => s.run())); db.exec("COMMIT"); return out; }
    catch (e) { db.exec("ROLLBACK"); throw e; }
  } };
  return { db, adapter };
}
test("manual input preserves unknown measurements and optional provenance", () => {
  const payload = normalizeManualAsset(input, now);
  assert.equal(payload.priceMinor, 200000000000);
  assert.equal(payload.source, null); assert.equal(payload.bedrooms, null);
  assert.equal(payload.bathrooms, null); assert.equal(payload.areaSqmX100, 3200);
  const sourced = normalizeManualAsset({ ...input, sourceUrl: "https://example.com/listing/1", bedrooms: 0 }, now);
  assert.equal(sourced.source.url, "https://example.com/listing/1"); assert.equal(sourced.bedrooms, 0);
});
test("save is private, atomic with audit and idempotent; changed retries are refused", async () => {
  const { db, adapter } = setup();
  try {
    const draft = await saveManualAsset(adapter, "admin", "test-request-key-123", input, now);
    assert.equal(draft.status, "REVIEW_PENDING");
    const retry = await saveManualAsset(adapter, "admin", "test-request-key-123", input, now + 1000);
    assert.equal(retry.id, draft.id);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM audit_logs").get().n, 1);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM listings").get().n, 0);
    await assert.rejects(saveManualAsset(adapter, "admin", "test-request-key-123", { ...input, price: 1 }, now));
    assert.equal((await listManualAssets(adapter, "admin")).length, 1);
  } finally { db.close(); }
});
test("members and inactive admins cannot read or write drafts", async () => {
  const { db, adapter } = setup();
  try {
    for (const actor of ["member", "inactive", "absent"]) {
      await assert.rejects(saveManualAsset(adapter, actor, "test-request-key-123", input, now));
      await assert.rejects(listManualAssets(adapter, actor));
    }
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM manual_asset_drafts").get().n, 0);
  } finally { db.close(); }
});
test("invalid amounts, links, contacts and request keys do not write", async () => {
  const { db, adapter } = setup();
  try {
    for (const change of [{ price: 0 }, { price: -1 }, { sourceUrl: "javascript:alert(1)" }, { bedrooms: 1.5 }, { summary: "Contact test@example.com for details" }])
      await assert.rejects(saveManualAsset(adapter, "admin", "test-request-key-123", { ...input, ...change }, now));
    await assert.rejects(saveManualAsset(adapter, "admin", "bad", input, now));
    assert.equal((await listManualAssets(adapter, "admin")).length, 0);
  } finally { db.close(); }
});
