import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createD1DiscoveryRepository, validateDiscoveredAsset } from "../db/discovery-repository.ts";
import { assets } from "../lib/assets.ts";

const sql = readFileSync(new URL("../drizzle/0018_discovered_assets.sql", import.meta.url), "utf8");
const sample = { ...assets[0], id: "external-1", sourceName: "Dot Property Vietnam",
  sourceUrl: "https://www.dotproperty.com.vn/listing/1", country: "Vietnam", countryCode: "VN",
  currency: "VND", price: 1500000000, updatedAt: "", trustStatus: "PRELIMINARY", isGliDirect: false };
const time = "2026-10-01T00:00:00Z";
function adapter(db) {
  return { prepare(sql) { let args = []; return {
    bind(...values) { args = values; return this; },
    async first() { return db.prepare(sql).get(...args) ?? null; },
    async all() { return { success: true, results: db.prepare(sql).all(...args) }; },
    async execute() { return { success: true, results: db.prepare(sql).all(...args) }; },
  }; }, async batch(statements) {
    db.exec("BEGIN");
    try { const result = await Promise.all(statements.map(s => s.execute())); db.exec("COMMIT"); return result; }
    catch (error) { db.exec("ROLLBACK"); throw error; }
  } };
}
test("discovery survives reopening and a separate repository instance", async () => {
  const directory = mkdtempSync(join(tmpdir(), "gli-discovery-"));
  const path = join(directory, "data.sqlite");
  let db = new DatabaseSync(path);
  try {
    db.exec(sql);
    await createD1DiscoveryRepository(adapter(db)).save([sample], time);
    db.close(); db = new DatabaseSync(path);
    const restored = await createD1DiscoveryRepository(adapter(db)).get(sample.id);
    assert.equal(restored.currency, "VND"); assert.equal(restored.price, sample.price);
    assert.equal(restored.updatedAt, ""); assert.equal(restored.sourceObservedAt, "2026-10-01T00:00:00.000Z");
    assert.equal(restored.trustStatus, "PRELIMINARY");
  } finally { db.close(); rmSync(directory, { recursive: true }); }
});
test("source/transaction identity keeps stable IDs, first seen, and newer values", async () => {
  const db = new DatabaseSync(":memory:"); db.exec(sql);
  try {
    const repo = createD1DiscoveryRepository(adapter(db));
    await repo.save([sample], time);
    const updated = await repo.save([{ ...sample, id: "replacement", price: 1600000000 }], "2026-10-02T00:00:00Z");
    assert.equal(updated[0].id, sample.id);
    await repo.save([{ ...sample, price: 1 }], time);
    assert.equal((await repo.get(sample.id)).price, 1600000000);
    await repo.save([{ ...sample, id: "rent-1", transaction: "rent" }], time);
    assert.equal((await repo.list(["Vietnam"])).length, 2);
    assert.equal((await repo.list(["Philippines"])).length, 0);
    assert.equal(db.prepare("SELECT first_seen_at FROM discovered_assets WHERE public_id=?").get(sample.id).first_seen_at, Date.parse(time));
  } finally { db.close(); }
});
test("cached observation time is not renewed by a later search", async () => {
  const db = new DatabaseSync(":memory:"); db.exec(sql);
  try {
    const repo = createD1DiscoveryRepository(adapter(db));
    await repo.save([{ ...sample, sourceObservedAt: time }], "2026-10-05T00:00:00Z");
    assert.equal(db.prepare("SELECT observed_at FROM discovered_assets").get().observed_at, Date.parse(time));
  } finally { db.close(); }
});
test("invalid/verified/private payloads cannot promote discovery; invalid batch writes nothing", async () => {
  const db = new DatabaseSync(":memory:"); db.exec(sql);
  try {
    const repo = createD1DiscoveryRepository(adapter(db));
    await assert.rejects(repo.save([sample, { ...sample, id: "bad", sourceUrl: "javascript:alert(1)" }], time));
    assert.equal((await repo.list()).length, 0);
    for (const change of [{ trustStatus: "VERIFIED" }, { isGliDirect: true }, { price: NaN }]) {
      assert.throws(() => validateDiscoveredAsset({ ...sample, ...change }));
    }
    const record = validateDiscoveredAsset({ ...sample, internalNote: "secret", images: ["https://example.com/1.jpg"] });
    assert.equal(record.internalNote, undefined); assert.equal(record.images.length, 1);
  } finally { db.close(); }
});
