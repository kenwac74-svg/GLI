import test from "node:test";
import assert from "node:assert/strict";
import { migratedDatabase } from "./support/sqlite-d1.mjs";
import { createD1AssetReferenceRepository } from "../db/asset-reference-repository.ts";
import { assets } from "../lib/assets.ts";

const sample = {...assets[0], id:"retained-1", sourceName:"Example", sourceUrl:"https://example.com/unit/1", isGliDirect:false, trustStatus:"PRELIMINARY"};
const t1 = "2026-10-01T00:00:00Z", t2 = "2026-10-02T00:00:00Z", t3 = "2026-10-03T00:00:00Z";
test("additive migration preserves seeded listings and old favorites", () => {
  const {sqlite} = migratedDatabase();
  try {
    assert.equal(sqlite.prepare("SELECT count(*) AS n FROM listings").get().n,8);
    for (const name of ["asset_references","asset_versions","asset_favorite_refs","favorites"]) assert.ok(sqlite.prepare("SELECT name FROM sqlite_master WHERE name=?").get(name));
  } finally {sqlite.close();}
});
test("new, unchanged, changed and reverted content preserve ordered versions", async () => {
  const {sqlite,database} = migratedDatabase();
  try {
    const repo=createD1AssetReferenceRepository(database);
    assert.equal((await repo.upsertSnapshot(sample,t1,"discovery")).changed,true);
    assert.equal((await repo.upsertSnapshot({...sample,priceUsdReference:{amount:99,asOf:t2,provider:"FX"}},t2,"discovery")).changed,false);
    await repo.upsertSnapshot({...sample,price:sample.price+100},t3,"discovery");
    await repo.upsertSnapshot(sample,"2026-10-04T00:00:00Z","discovery");
    assert.equal(sqlite.prepare("SELECT count(*) AS n FROM asset_versions").get().n,3);
    assert.deepEqual((await repo.priceHistory(sample.id)).map(x=>x.price),[sample.price,sample.price+100,sample.price]);
    assert.equal((await repo.get(sample.id)).asset.price,sample.price);
  } finally {sqlite.close();}
});
test("thin and stale refreshes do not destroy rich facts or replace newer price", async () => {
  const {sqlite,database}=migratedDatabase();
  try {
    const repo=createD1AssetReferenceRepository(database);
    await repo.upsertSnapshot({...sample,summary:"Full description",images:["https://example.com/1.jpg"]},t1,"discovery");
    await repo.upsertSnapshot({...sample,summary:sample.title,price:999},t2,"discovery");
    await repo.upsertSnapshot({...sample,price:1},t1,"discovery");
    const ref=await repo.get(sample.id);
    assert.equal(ref.asset.summary,"Full description");
    assert.deepEqual(ref.asset.images,["https://example.com/1.jpg"]);
    assert.equal(ref.asset.price,999);
  } finally {sqlite.close();}
});
test("a version insert failure rolls back both latest and discovery mirror", async () => {
  const {sqlite,database}=migratedDatabase();
  try {
    const repo=createD1AssetReferenceRepository(database);
    await repo.upsertSnapshot(sample,t1,"discovery");
    sqlite.exec("CREATE TRIGGER fail_version BEFORE INSERT ON asset_versions BEGIN SELECT RAISE(ABORT, 'test failure'); END");
    await assert.rejects(repo.upsertSnapshot({...sample,price:1},t2,"discovery"));
    assert.equal((await repo.get(sample.id)).asset.price,sample.price);
    assert.equal(JSON.parse(sqlite.prepare("SELECT payload_json FROM discovered_assets WHERE public_id=?").get(sample.id).payload_json).price,sample.price);
  } finally {sqlite.close();}
});
test("concurrent refreshes keep the newest price and missing-field protection",async()=>{
  const {sqlite,database}=migratedDatabase();
  try {
    const repo=createD1AssetReferenceRepository(database);
    await repo.upsertSnapshot({...sample,summary:"Rich description"},t1,"discovery");
    await Promise.all([repo.upsertSnapshot({...sample,summary:sample.title,price:900},t3,"discovery"),repo.upsertSnapshot({...sample,summary:sample.title,price:800},t2,"discovery")]);
    const ref=await repo.get(sample.id);
    assert.equal(ref.asset.price,900);
    assert.equal(ref.asset.summary,"Rich description");
    assert.equal(JSON.parse(sqlite.prepare("SELECT payload_json FROM discovered_assets WHERE public_id=?").get(sample.id).payload_json).price,900);
  }finally{sqlite.close();}
});
test("partial fact and photo collections preserve missing entries",async()=>{
  const {sqlite,database}=migratedDatabase();
  try{
    const repo=createD1AssetReferenceRepository(database);
    await repo.upsertSnapshot({...sample,detailFacts:[{label:"Floor",value:"10"},{label:"Tenure",value:"freehold"}],images:["https://example.com/a.jpg","https://example.com/b.jpg"]},t1,"discovery");
    await repo.upsertSnapshot({...sample,detailFacts:[{label:"Floor",value:"11"}],images:["https://example.com/a.jpg"]},t2,"discovery");
    const ref=await repo.get(sample.id);
    assert.deepEqual(ref.asset.detailFacts,[{label:"Floor",value:"11"},{label:"Tenure",value:"freehold"}]);
    assert.equal(ref.asset.images.length,2);
  }finally{sqlite.close();}
});
