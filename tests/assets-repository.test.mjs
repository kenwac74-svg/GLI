import assert from "node:assert/strict";
import test from "node:test";
import { buildPublicAssetsQuery, createAssetsRepository, mapListingRowToAsset } from "../db/assets-repository.ts";

const row = (overrides={}) => ({ publicId:"GLI-KH-TEST", country:"Cambodia", city:"Phnom Penh", district:null, transactionType:"rent", propertyType:"condo", title:"Test residence", summary:"Fixture", priceMinor:50025, currency:"USD", areaSqmX100:7450, bedrooms:2, bathrooms:2, imageUrl:null, status:"ACTIVE", isGliDirect:1, updatedAt:"2026-07-30T00:00:00Z", trustScore:81, trustStatus:"REVIEWING", strengthsJson:'["River view"]', checksJson:null, ...overrides });

test("maps D1 units, nulls, and booleans", () => { const asset=mapListingRowToAsset(row()); assert.equal(asset.price,500.25); assert.equal(asset.areaSqm,74.5); assert.equal(asset.countryCode,"KH"); assert.equal(asset.isGliDirect,true); assert.deepEqual(asset.strengths,["River view"]); assert.deepEqual(asset.checks,[]); });
test("builds ACTIVE-only minor-unit filters", () => { assert.deepEqual(buildPublicAssetsQuery({country:"Cambodia",minPrice:300.1,maxPrice:700.99,limit:20}),{status:"ACTIVE",country:"Cambodia",city:undefined,transactionType:undefined,propertyType:undefined,minPriceMinor:30010,maxPriceMinor:70099,minBedrooms:undefined,limit:20}); });
test("filters and orders deterministically", async () => { const repository=createAssetsRepository(async()=>[row({publicId:"LOW",trustScore:70}),row({publicId:"HIGH",trustScore:90}),row({publicId:"OTHER",city:"Siem Reap"})]); const assets=await repository.listPublicAssets({city:"Phnom Penh"}); assert.deepEqual(assets.map((asset)=>asset.id),["HIGH","LOW"]); });
test("rejects inactive and does not hide D1 failures", async () => { assert.throws(()=>mapListingRowToAsset(row({status:"ARCHIVED"})),/not public/); const repository=createAssetsRepository(async()=>{throw new Error("D1 unavailable")}); await assert.rejects(repository.listPublicAssets(),/D1 unavailable/); });
