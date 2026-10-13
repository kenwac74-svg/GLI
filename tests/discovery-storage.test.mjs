import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createD1DiscoveryRepository, validateDiscoveredAsset } from "../db/discovery-repository.ts";
import { assets } from "../lib/assets.ts";
import { basicDetailFacts, bedroomLabel } from "../lib/asset-basic-info.ts";
import { sqliteD1 } from "./support/sqlite-d1.mjs";

const sql = readFileSync(new URL("../drizzle/0018_discovered_assets.sql", import.meta.url), "utf8")
  + readFileSync(new URL("../drizzle/0020_asset_retention.sql", import.meta.url), "utf8");
const sample = { ...assets[0], id: "external-1", sourceName: "Dot Property Vietnam",
  sourceUrl: "https://www.dotproperty.com.vn/listing/1", country: "Vietnam", countryCode: "VN",
  currency: "VND", price: 1500000000, updatedAt: "", trustStatus: "PRELIMINARY", isGliDirect: false };
const time = "2026-10-01T00:00:00Z";

test("basic public fields survive save, reread and detail projection without verification promotion", async () => {
  const db = new DatabaseSync(":memory:"); db.exec(sql);
  try {
    const repo = createD1DiscoveryRepository(adapter(db));
    const enriched = { ...sample, bedrooms: null, bathrooms: null, assetCategory: "residential",
      offerLabel: "월 임대료", priceLabel: "VND 원문 가격", publicationBasis: sample.sourceUrl,
      priceUsdReference: { amount: 60000, provider: "test FX", asOf: "2026-10-01T00:00:00.000Z" },
      documentDateLabel: "미확인", summary: "Source description", images: ["https://example.com/1.jpg", "https://example.com/2.jpg"],
      sourcePublishedAt: time, sourceUpdatedAt: "2026-10-02T00:00:00Z",
      detailFacts: [{ label: "가구", value: "Furnished" }, { label: "관리비", value: "원문 미기재" }],
      publicResources: [{ label: "원문", url: sample.sourceUrl, type: "website" }] };
    await repo.save([enriched], "2026-10-03T00:00:00Z");
    const restored = await repo.get(sample.id);
    for (const key of ["summary", "detailFacts", "assetCategory", "offerLabel", "priceLabel", "publicationBasis", "documentDateLabel", "publicResources", "images"]) assert.deepEqual(restored[key], enriched[key]);
    assert.deepEqual(restored.priceUsdReference, enriched.priceUsdReference);
    assert.equal(restored.bedrooms, null);
    assert.equal(bedroomLabel(null), "침실 미확인"); assert.equal(bedroomLabel(0), "스튜디오");
    const facts = basicDetailFacts(restored);
    assert.equal(facts.find(f => f.label === "가구").value, "Furnished");
    assert.notEqual(facts.find(f => f.label === "원문 갱신일").value, facts.find(f => f.label === "GLI 수집/확인일").value);
    assert.equal(basicDetailFacts(sample).find(f => f.label === "원문 갱신일").value, "미확인");
    await assert.rejects(repo.save([{ ...sample, publicResources: [{ label: "private", type: "website", url: "javascript:alert(1)" }] }], time));
    assert.equal(restored.trustStatus, "PRELIMINARY");
    await repo.save([{ ...sample, summary: sample.title, price: sample.price + 1 }], "2026-10-04T00:00:00Z");
    assert.equal((await repo.get(sample.id)).summary, enriched.summary);
    assert.equal((await repo.get(sample.id)).priceUsdReference, undefined);
    assert.deepEqual((await repo.get(sample.id)).detailFacts, enriched.detailFacts);
    assert.deepEqual((await repo.get(sample.id)).images, enriched.images);
  } finally { db.close(); }
});

test("legacy Cambodia observation is not displayed as an original update date", async () => {
  const db = new DatabaseSync(":memory:"); db.exec(sql);
  try {
    const repo = createD1DiscoveryRepository(adapter(db));
    const legacy = { ...sample, id: "GLI-KH-LIVE-LEGACY", updatedAt: time };
    await repo.save([legacy], time);
    const restored = await repo.get(legacy.id);
    assert.equal(restored.updatedAt, "");
    assert.equal(restored.sourceObservedAt, "2026-10-01T00:00:00.000Z");
  } finally { db.close(); }
});
function adapter(db) {
  return sqliteD1(db);
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
