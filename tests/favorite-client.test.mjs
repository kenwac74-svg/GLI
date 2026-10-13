import test from "node:test";
import assert from "node:assert/strict";
import { readFavorites, writeFavorite, favoriteCandidate } from "../lib/favorite-client.ts";

test("favorite writes use authenticated same-origin API and never local persistence", async () => {
  const calls = [];
  const fetcher = async (...args) => { calls.push(args); return new Response(JSON.stringify({created:true}), {status:201}); };
  await writeFavorite("GLI-KH-001", true, fetcher);
  await writeFavorite("GLI-KH-001", false, fetcher);
  assert.equal(calls[0][0], "/api/favorites");
  assert.equal(calls[0][1].method, "POST");
  assert.equal(calls[1][1].method, "DELETE");
  assert.deepEqual(JSON.parse(calls[0][1].body), {assetId:"GLI-KH-001"});
});
test("failed writes expose auth/error state instead of claiming saved", async () => {
  const result = await writeFavorite("GLI-KH-001", true, async () => new Response(JSON.stringify({error:"로그인이 필요합니다.",signInPath:"/my"}), {status:401}));
  assert.equal(result.ok, false);
  assert.equal(result.signInPath, "/my");
});
test("list reads are fresh database responses", async () => {
  let options;
  const result = await readFavorites(async (_url, init) => { options=init; return new Response(JSON.stringify({favorites:[]}), {status:200}); });
  assert.equal(result.ok, true);
  assert.deepEqual(result.favorites, []);
  assert.equal(options.cache, "no-store");
});
test("favorite projection preserves money units and missing versus studio", () => {
  const row = {publicId:"a",country:"Vietnam",city:"HCMC",district:null,title:"Original",transactionType:"sale",priceMinor:1234500,currency:"USD",imageUrl:null,trustScore:70};
  const candidate = favoriteCandidate(row);
  assert.equal(candidate.price, 12345);
  assert.equal(candidate.bedrooms, null);
  assert.equal(candidate.bathrooms, null);
  assert.equal(favoriteCandidate({...row, bedrooms:0,areaSqmX100:5500}).bedrooms, 0);
  assert.equal(favoriteCandidate({...row,areaSqmX100:5500}).areaSqm, 55);
});
