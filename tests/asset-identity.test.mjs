import test from "node:test";
import assert from "node:assert/strict";
import { confirmedIdentityGroup } from "../lib/asset-identity.ts";
import { createD1AssetReferenceRepository } from "../db/asset-reference-repository.ts";
import { migratedDatabase } from "./support/sqlite-d1.mjs";
import { assets } from "../lib/assets.ts";

const first={...assets[0],id:"unit-a",sourceUrl:"https://example.com/a",sourceName:"A",isGliDirect:false};
const second={...first,id:"unit-b",sourceUrl:"https://second.example/b",sourceName:"B"};
const evidence={kind:"exact_unit_identifier",issuer:"registry",propertyId:"building1",unitId:"room12",basisUrls:[first.sourceUrl,second.sourceUrl]};
const facts=[{label:"ID issuer",value:"registry"},{label:"Property ID",value:"building1"},{label:"Unit ID",value:"room12"}];
test("same building or area without exact stored unit identifiers cannot merge",async()=>{
  await assert.rejects(confirmedIdentityGroup([first,second],evidence));
  await assert.rejects(confirmedIdentityGroup([{...first,detailFacts:facts},{...second,detailFacts:[...facts.slice(0,2),{label:"Unit ID",value:"room13"}]}],evidence));
  await assert.rejects(confirmedIdentityGroup([{...first,detailFacts:facts},{...second,detailFacts:facts,transaction:first.transaction === "sale" ? "rent" : "sale"}],evidence));
});
test("confirmed grouping preserves original IDs, source snapshots and prices",async()=>{
  const {sqlite,database}=migratedDatabase();
  try {
    const repo=createD1AssetReferenceRepository(database);
    await repo.upsertSnapshot({...first,detailFacts:facts},"2026-10-01T00:00:00Z","discovery");
    await repo.upsertSnapshot({...second,detailFacts:facts,price:first.price+50},"2026-10-02T00:00:00Z","discovery");
    const {groupId}=await repo.linkConfirmedDuplicates([first.id,second.id],evidence);
    assert.equal((await repo.get(first.id)).identityGroup,groupId);
    assert.equal((await repo.get(second.id)).asset.price,first.price+50);
    assert.equal((await repo.priceHistory(first.id)).length,2);
    assert.equal(sqlite.prepare("SELECT count(*) AS n FROM asset_references").get().n,2);
    await repo.upsertSnapshot({...second,detailFacts:[...facts.slice(0,2),{label:"Unit ID",value:"room13"}],price:999},"2026-10-03T00:00:00Z","discovery");
    assert.equal((await repo.get(second.id)).identityGroup,null);
    assert.ok(!(await repo.priceHistory(first.id)).some(point=>point.price===999));
  } finally {sqlite.close();}
});
