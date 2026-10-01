import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { assetLocale, createAssetLocalizer } from "../lib/asset-localization.ts";
import { assets } from "../lib/assets.ts";

const original = {
  id: "GLI-KH-LIVE-TRANSLATION", country: "Cambodia", countryCode: "KH",
  city: "Sihanoukville", district: "Otres", transaction: "sale", propertyType: "condo",
  bedrooms: 1, bathrooms: 1, title: "Time Square 10 - 1 Bedroom Condo For Sale",
  summary: "Asking price USD 56,721. Area 50 sqm. Rental income is not confirmed.",
  price: 56721, maxPrice: 60000, currency: "USD", areaSqm: 50,
  image: "https://example.test/image.jpg", trustScore: 55, trustStatus: "PRELIMINARY", isGliDirect: false,
  sourceName: "CAM Realty", sourceUrl: "https://camrealtyservice.com/property/test/",
  updatedAt: "2026-09-18T00:00:00Z", strengths: ["공개 원문 연결"], checks: ["Occupied; verify lease"],
  detailFacts: [{ label: "Tenure", value: "Not confirmed" }], matchReasons: ["예산 일치"],
};
function memoryStore() {
  const records = new Map();
  return { records, async get(key) { return records.has(key) ? { text: async () => records.get(key) } : null; }, async put(key, value) { records.set(key, value); } };
}
function fakeProvider(mutate = value => value) {
  const requests = [];
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body);
    requests.push({ url, headers: init.headers, body });
    const input = JSON.parse(body.contents[0].parts[0].text);
    const items = input.items.map(item => ({ ...item, fields: item.fields.map(field => ({ ...field,
      text: ({
        title: "Time Square __GLI_0__ 침실 __GLI_1__개 콘도 매매",
        summary: "매매 호가 __GLI_0__ __GLI_1__. 면적 __GLI_2__㎡. 임대 수입은 확인되지 않았습니다.",
        "checks.0": "점유 중; 임대차 확인 필요", "detailFacts.0.label": "권리", "detailFacts.0.value": "확인되지 않음",
      })[field.key] ?? `번역 ${field.text}`,
    })) }));
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(mutate({ items })) }] } }] });
  };
  return { fetchImpl, requests };
}
const config = { apiKey: "test-only", model: "gemini-test", enabled: true };

test("source-less demo titles localize in Korean without paid calls, source attribution or mutation", async () => {
  const before = structuredClone(assets);
  const translate = createAssetLocalizer({ enabled: false, fetchImpl: async () => assert.fail("demo titles must not spend tokens") });
  const localized = await translate(assets);
  assert.ok(localized.every(asset => /[가-힣]/.test(asset.title)));
  assert.deepEqual(assets, before);
  const facts = asset => Object.fromEntries(Object.entries(asset).filter(([key]) => key !== "title"));
  assert.deepEqual(localized.map(facts), assets.map(facts));
  assert.equal(await translate(assets, "en"), assets);
  const changed = { ...assets[0], title: "Different property" };
  const external = { ...assets[0], sourceUrl: "https://example.test/real-record" };
  assert.deepEqual(await translate([changed, external]), [changed, external]);
});

test("projects Korean text only; retains every numeric, identity and source field and original input", async () => {
  const before = structuredClone(original), store = memoryStore(), provider = fakeProvider();
  const translate = createAssetLocalizer({ ...config, store, fetchImpl: provider.fetchImpl });
  const [result] = await translate([original]);
  assert.match(result.title, /침실 1개/);
  assert.match(result.summary, /USD 56,721\./);
  assert.match(result.summary, /확인되지/);
  assert.equal(result.checks[0], "점유 중; 임대차 확인 필요");
  assert.equal(result.detailFacts[0].label, "권리");
  for (const key of Object.keys(original).filter(key => !["title", "summary", "checks", "detailFacts"].includes(key))) assert.deepEqual(result[key], original[key]);
  assert.deepEqual(original, before);
  const record = JSON.parse([...store.records.values()][0]);
  assert.equal(record.original.find(field => field.key === "title").text, original.title);
  assert.equal(record.translated.find(field => field.key === "title").text, result.title);
  assert.ok(record.translatedAt);
  assert.equal(provider.requests[0].body.tools, undefined);
  assert.equal(provider.requests[0].headers["x-goog-api-key"], "test-only");
  assert.doesNotMatch(JSON.stringify(provider.requests[0].body), /test-only/);
});

test("persistent translation is reused after service recreation and when only observation time changes", async () => {
  const store = memoryStore(), provider = fakeProvider();
  const first = createAssetLocalizer({ ...config, store, fetchImpl: provider.fetchImpl });
  const [result] = await first([original]);
  await first([original]);
  const second = createAssetLocalizer({ ...config, store, fetchImpl: provider.fetchImpl });
  assert.equal((await second([{ ...original, updatedAt: "2026-09-19" }]))[0].title, result.title);
  assert.equal(provider.requests.length, 1);
  await second([{ ...original, summary: `${original.summary} New source wording.` }]);
  assert.equal(provider.requests.length, 2);
});

test("same original URL shares translation, different source URLs remain independent", async () => {
  const provider = fakeProvider(), translate = createAssetLocalizer({ ...config, store: null, fetchImpl: provider.fetchImpl });
  const results = await translate([original, { ...original, id: "OTHER-ID" }, { ...original, id: "OTHER-PORTAL", sourceUrl: "https://www.cambodiaproperty.asia/en/test/" }]);
  assert.equal(results.length, 3);
  assert.equal(results[0].title, results[1].title);
  assert.equal(JSON.parse(provider.requests[0].body.contents[0].parts[0].text).items.length, 2);
});

test("concurrent requests coalesce and batching is bounded to six with eighteen candidates", async () => {
  const store = memoryStore(), provider = fakeProvider();
  const translate = createAssetLocalizer({ ...config, store, fetchImpl: provider.fetchImpl });
  await Promise.all([translate([original]), translate([original]), translate([original])]);
  assert.equal(provider.requests.length, 1);
  const many = Array.from({ length: 20 }, (_, index) => ({ ...original, id: `ID-${index}`, sourceUrl: `https://camrealtyservice.com/property/${index}/` }));
  const result = await translate(many);
  assert.equal(provider.requests.length, 4);
  assert.equal(result.length, 20);
  assert.equal(result[18].title, original.title);
  assert.ok(provider.requests.every(request => JSON.parse(request.body.contents[0].parts[0].text).items.length <= 6));
});

test("English, curated, already Korean, oversized and disabled inputs do not trigger translation", async () => {
  const provider = fakeProvider(), translate = createAssetLocalizer({ ...config, store: null, fetchImpl: provider.fetchImpl });
  assert.deepEqual(await translate([original], "en"), [original]);
  await translate([{ ...original, isGliDirect: true }, { ...original, sourceUrl: undefined }]);
  await translate([{ ...original, title: "콘도 매매", summary: "확인 필요", checks: [], detailFacts: [] }]);
  await translate([{ ...original, summary: "X".repeat(11000) }]);
  await createAssetLocalizer({ ...config, enabled: false, fetchImpl: provider.fetchImpl })([original]);
  assert.equal(provider.requests.length, 0);
  assert.equal(assetLocale(undefined), "ko");
  assert.equal(assetLocale("en-US"), "en");
  assert.equal(assetLocale("unknown"), null);
});

for (const [label, mutate] of [
  ["changed numbers", response => { response.items[0].fields[0].text += " 999"; return response; }],
  ["missing placeholders", response => { response.items[0].fields[0].text = "콘도 매매"; return response; }],
  ["unrequested fields", response => { response.items[0].fields.push({ key: "price", text: "무료" }); return response; }],
  ["cross-item mixup", response => { response.items[0].id = "wrong-id"; return response; }],
  ["HTML injection", response => { response.items[0].fields[0].text += "<script>alert()</script>"; return response; }],
]) test(`rejects ${label} without hiding the listing; failure cooldown avoids repeated charges`, async () => {
  const provider = fakeProvider(mutate), translate = createAssetLocalizer({ ...config, store: null, fetchImpl: provider.fetchImpl });
  assert.deepEqual(await translate([original]), [original]);
  assert.deepEqual(await translate([original]), [original]);
  assert.equal(provider.requests.length, 1);
});

test("provider and storage failures leave source readable; no retry or provider substitution", async () => {
  let count = 0;
  const translate = createAssetLocalizer({ ...config, store: { async get() { throw Error("storage"); }, async put() {} }, fetchImpl: async () => { count++; return new Response("error", { status: 429 }); } });
  assert.deepEqual(await translate([original]), [original]);
  assert.equal(count, 1);
});

test("search, detail and public list share the translation service without changing approved visual artifacts", () => {
  const search = readFileSync(new URL("../app/api/search/route.ts", import.meta.url), "utf8");
  assert.match(search, /localizeAssets\(prepared\.preparedSearch\.matches, locale, localization\)/);
  assert.ok(search.indexOf("localizeAssets(prepared.preparedSearch.matches") < search.indexOf("const result = await runAdvisorSearch"));
  for (const file of ["app/assets/[id]/page.tsx", "app/api/assets/route.ts"]) assert.match(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), /await localizeAssets/);
  assert.match(readFileSync(new URL("../lib/ai-search.ts", import.meta.url), "utf8"), /copy its supplied title verbatim/);
});

test("unmetered public reads do not start paid translation even with a configured key", async t => {
  const upstream = t.mock.method(globalThis, "fetch", async () => { assert.fail("unmetered paid call"); });
  const translate = createAssetLocalizer({ apiKey: "test-configured", store: null, enabled: true });
  assert.deepEqual(await translate([original]), [original]);
  assert.equal(upstream.mock.callCount(), 0);
});

test("mixed Korean fields are translated and quoted compound names are protected verbatim", async () => {
  let calls = 0;
  const translate = createAssetLocalizer({ ...config, store: null, fetchImpl: async (url, init) => {
    calls++;
    const body = JSON.parse(init.body);
    const input = JSON.parse(body.contents[0].parts[0].text);
    assert.match(body.systemInstruction.parts[0].text, /mixed Korean/);
    assert.equal(input.items[0].fields[0].text, "__GLI_0__의 Furnished 콘도");
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ items: input.items.map(item => ({ ...item,
      fields: item.fields.map(field => ({ ...field, text: "__GLI_0__의 가구 포함 콘도" })) })) }) }] } }] });
  } });
  const asset = { ...original, title: '"R&F City, Phnom Penh"의 Furnished 콘도', summary: "월 500 USD", checks: [], detailFacts: [] };
  const [localized] = await translate([asset]);
  assert.equal(localized.title, '"R&F City, Phnom Penh"의 가구 포함 콘도');
  assert.equal(calls, 1);
  assert.equal(asset.title, '"R&F City, Phnom Penh"의 Furnished 콘도');
});

test("cache-only details reuse compatible v1 translations rather than losing them on upgrade", async () => {
  const { createHash } = await import("node:crypto");
  const store = memoryStore(), provider = fakeProvider();
  await createAssetLocalizer({ ...config, store, fetchImpl: provider.fetchImpl })([original]);
  const record = JSON.parse([...store.records.values()][0]);
  record.version = "asset-ko-v1";
  const key = createHash("sha256").update(JSON.stringify([record.version, "ko", config.model, original.sourceUrl, record.original])).digest("hex");
  store.records.clear();
  store.records.set(`asset-translations/asset-ko-v1/${key}.json`, JSON.stringify(record));
  const [localized] = await createAssetLocalizer({ ...config, store })([original]);
  assert.match(localized.title, /침실 1개/);
  assert.equal(provider.requests.length, 1);
});

test("active approved shell restores saved FX without a paid search and shares card/summary conversion", () => {
  const shell = readFileSync(new URL("../app/components/claude-design-shell.tsx", import.meta.url), "utf8");
  const restore = shell.slice(shell.indexOf('void fetch("/api/exchange-rates")'), shell.indexOf('void fetch("/api/exchange-rates")') + 1200);
  assert.match(restore, /setRuntimeTurns/);
  assert.match(restore, /applySearchResult/);
  assert.doesNotMatch(restore, /runSearch\(/);
  assert.match(shell, /candidateLocation\(match\)/);
  assert.doesNotMatch(shell, /match\.price \* 1380/);
  const route = readFileSync(new URL("../app/api/search/route.ts", import.meta.url), "utf8");
  assert.match(route, /prepared\.preparedSearch\.rate =/);
  assert.ok(route.indexOf("prepared.preparedSearch.rate =") < route.indexOf("const result = await runAdvisorSearch"));
});
