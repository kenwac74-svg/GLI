import assert from "node:assert/strict";
import { createAssetLocalizer } from "../lib/asset-localization.ts";
import { discoverCambodiaAssets } from "../lib/cambodia-live-discovery.ts";

// Opt-in GLI-only live test: one Gemini batch, no search grounding or advisor call.
if (!process.argv.includes("--run")) throw new Error("Pass --run to authorize the bounded GLI translation test.");
if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured.");
const source = await discoverCambodiaAssets({ city: "Sihanoukville" });
const assets = source.assets.filter(asset => asset.city.toLowerCase() === "sihanoukville").slice(0, 3);
assert.ok(assets.length, "No public source candidates available");
const records = new Map();
const store = { async get(key) { return records.has(key) ? { text: async () => records.get(key) } : null; }, async put(key, value) { records.set(key, value); } };
let calls = 0;
let usage = null;
const fetchImpl = async (...args) => {
  calls++;
  const response = await fetch(...args);
  const payload = await response.clone().json().catch(() => null);
  usage = payload?.usageMetadata ?? null;
  return response;
};
const start = Date.now();
const localize = createAssetLocalizer({ store, fetchImpl });
const translated = await localize(assets);
console.log(JSON.stringify({ examples: translated.map((asset, index) => ({ original: assets[index].title, title: asset.title, summary: asset.summary })), records: records.size, usage }, null, 2));
for (let index = 0; index < assets.length; index++) {
  assert.match(translated[index].summary, /[가-힣]/);
  for (const key of ["id", "price", "currency", "sourceUrl", "areaSqm", "trustScore", "updatedAt"]) assert.deepEqual(translated[index][key], assets[index][key]);
}
const cached = await createAssetLocalizer({ store, fetchImpl })(assets);
assert.equal(calls, 1, "A fresh localizer must reuse stored translations");
assert.deepEqual(cached, translated);
console.log(JSON.stringify({ calls, elapsedMs: Date.now() - start, records: records.size, usage,
  sources: source.sources,
  examples: translated.map((asset, index) => ({ id: asset.id, original: assets[index].title, translated: asset.title, summary: asset.summary, price: asset.price, currency: asset.currency, sourceUrl: asset.sourceUrl })),
}, null, 2));
