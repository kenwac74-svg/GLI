import assert from "node:assert/strict";
import test from "node:test";
import { extractCriteria, searchAssets } from "../lib/search.ts";
import { runAdvisorSearch } from "../lib/ai-search.ts";

const assets = [
  { id: "EN-A", country: "Cambodia", countryCode: "KH", city: "Phnom Penh",
    district: "BKK1", transaction: "rent", propertyType: "condo", bedrooms: 2,
    bathrooms: 1, title: "BKK1 residence", price: 480, currency: "USD", areaSqm: 45,
    summary: "Furnished residence", trustScore: 79, trustStatus: "REVIEWING",
    isGliDirect: false, updatedAt: "2026-10-01", strengths: [], checks: ["Lease unverified"] },
  { id: "EN-B", country: "Cambodia", countryCode: "KH", city: "Phnom Penh",
    district: "Tonle Bassac", transaction: "rent", propertyType: "condo", bedrooms: 2,
    bathrooms: 1, title: "Bassac residence", price: 500, currency: "USD", areaSqm: 60,
    summary: "Residence", trustScore: 70, trustStatus: "REVIEWING",
    isGliDirect: false, updatedAt: "2026-10-01", strengths: [], checks: [] },
];
const query = "Rent a 2-bedroom condo in Phnom Penh under $500";
const noFetch = async () => { throw new Error("No network allowed"); };
const hangul = /[\uac00-\ud7a3]/;

test("existing English country and city aliases retain hard boundaries", () => {
  for (const [question, country, city] of [
    ["condo in Hanoi Vietnam", "Vietnam", "Hanoi"],
    ["condo in Cebu Philippines", "Philippines", "Cebu"],
    ["condo in Kuala Lumpur Malaysia", "Malaysia", "Kuala Lumpur"],
    ["condo in Siem Reap Cambodia", "Cambodia", "Siem Reap"],
  ]) {
    const criteria = extractCriteria(question);
    assert.equal(criteria.country, country);
    assert.equal(criteria.city, city);
  }
});

test("English rental questions parse bedrooms and USD budgets", () => {
  for (const amount of ["$500", "USD 500", "500 USD", "500 dollars", "US$500"]) {
    const criteria = extractCriteria(`Rent a 2-bedroom apartment in Phnom Penh under ${amount}`);
    assert.equal(criteria.maxPriceUsd, 500, amount);
    assert.equal(criteria.bedrooms, 2);
    assert.equal(criteria.transaction, "rent");
    assert.equal(criteria.purpose, "residence");
  }
});

test("English purchase, investment and seasonal intent parse without paid calls", () => {
  for (const amount of ["$100,000", "USD 100k", "$0.1 million", "100000 USD"]) {
    const criteria = extractCriteria(`Buy a condo in Cebu under ${amount}`);
    assert.equal(criteria.maxPriceUsd, 100000, amount);
    assert.equal(criteria.transaction, "sale");
  }
  assert.equal(extractCriteria("Invest in a condo in Hanoi for rental income").purpose, "income");
  assert.equal(extractCriteria("Buy a vacation home in Siem Reap for short-term rental").purpose, "seasonal");
  assert.equal(extractCriteria("Buy a vacation home in Siem Reap for short-term rental").transaction, "sale");
  assert.equal(extractCriteria("Buy a vacation home for short-term rental").wantsShortStay, true);
});

test("English KRW budget keeps the original amount without claiming a USD conversion", async () => {
  for (const amount of ["KRW 150 million", "KRW150m", "150 million KRW"]) {
    assert.equal(extractCriteria(`Buy a condo under ${amount}`).budgetKrw, 150000000);
  }
  const result = await runAdvisorSearch("Buy a condo in Phnom Penh under KRW 150 million", [],
    { locale: "en", provider: "disabled", fetch: noFetch });
  assert.doesNotMatch(result.answer, /\$|USD|108[,\d.]+/);
});

test("English rules fallback preserves candidates, prices, evidence and Korean default", async () => {
  const baseline = searchAssets(query, assets);
  const english = await runAdvisorSearch(query, assets, { locale: "en", provider: "disabled", fetch: noFetch });
  const korean = await runAdvisorSearch(query, assets, { provider: "disabled", fetch: noFetch });
  assert.equal(korean.answer, baseline.answer);
  assert.doesNotMatch(english.answer, hangul);
  assert.match(english.answer, /Phnom Penh/);
  const facts = asset => Object.fromEntries(Object.entries(asset).filter(([key]) => key !== "matchReasons"));
  assert.deepEqual(english.matches.map(facts), baseline.matches.map(facts));
  assert.ok(english.matches.every(asset => asset.matchReasons.every(reason => !hangul.test(reason))));
  assert.deepEqual(english.advisor.groundedAssetIds, baseline.matches.map(asset => asset.id));
  assert.deepEqual(english.citations.map(c => c.assetId), baseline.matches.map(asset => asset.id));
});

test("English empty, clarification and prepared fallback stay English without reparsing", async () => {
  for (const question of ["Buy a condo in Hanoi", "Invest in Phnom Penh", "Vacation home in Cebu", "condo in Phnom Penh"]) {
    const result = await runAdvisorSearch(question, [], { locale: "en", provider: "disabled", fetch: noFetch });
    assert.doesNotMatch(result.answer, hangul);
    assert.doesNotMatch(result.clarification, hangul);
    assert.match(result.answer, /supplied|available|collected/i);
  }
  const preparedSearch = searchAssets("condo in Phnom Penh", assets);
  const result = await runAdvisorSearch("Hanoi", [], { locale: "en", provider: "disabled", preparedSearch, fetch: noFetch });
  assert.deepEqual(result.criteria, preparedSearch.criteria);
  assert.deepEqual(result.matches.map(a => a.id), preparedSearch.matches.map(a => a.id));
  assert.doesNotMatch(result.clarification, hangul);
  assert.match(result.clarification, /buy|rent/i);
});

function payload(provider, advice) {
  const text = JSON.stringify(advice);
  return provider === "openrouter" ? { choices: [{ finish_reason: "stop", message: { content: text } }] }
    : { output_text: text };
}

test("prepared intent question in answer survives English fallback and provider failure", async () => {
  for (const provider of ["disabled", "openrouter"]) {
    const preparedSearch = { ...searchAssets("condo in Phnom Penh", []),
      answer: "Are you looking to buy a property, or rent one to live in?", clarification: null };
    let calls = 0;
    const result = await runAdvisorSearch("property", [], { locale: "en", provider,
      apiKey: "fake", model: "fake", preparedSearch,
      fetch: async () => { calls++; return new Response(null, { status: 503 }); } });
    assert.equal(result.answer, preparedSearch.answer);
    assert.equal(result.clarification, null);
    assert.equal(calls, provider === "disabled" ? 0 : 1);
    assert.doesNotMatch(result.answer, /No candidates|expand|Found/);
  }
});

test("known Korean prepared intent and FX interruption translate without losing meaning", async () => {
  for (const [answer, expected] of [
    ["매입할 물건을 찾으시나요, 아니면 거주할 집을 임차하려는 건가요?", /buy.*rent.*live/i],
    ["환율 자료를 현재 조회할 수 없어 예산 조건을 정확히 비교하지 못했습니다. 잠시 후 다시 시도해 주세요.", /exchange rate.*budget.*try again/i],
  ]) {
    const preparedSearch = { ...searchAssets("condo in Phnom Penh", []), answer, clarification: null };
    const result = await runAdvisorSearch(query, [], { locale: "en", provider: "disabled", preparedSearch, fetch: noFetch });
    assert.match(result.answer, expected);
    assert.doesNotMatch(result.answer, hangul);
    assert.equal(result.clarification, null);
  }
});

test("prepared English follow-up question is not replaced by criteria or scope questions", async () => {
  const preparedSearch = { ...searchAssets(query, assets),
    answer: "The lease evidence needs checking.", clarification: "Do you require an existing tenant?" };
  const result = await runAdvisorSearch(query, [], { locale: "en", provider: "disabled", preparedSearch, fetch: noFetch });
  assert.equal(result.answer, preparedSearch.answer);
  assert.equal(result.clarification, preparedSearch.clarification);
  assert.deepEqual(result.matches.map(a => a.id), preparedSearch.matches.map(a => a.id));
});

test("ambiguous and missing review references ask for the asset, never expand search", async () => {
  for (const missing of [false, true]) {
    let calls = 0;
    const preparedSearch = { ...searchAssets(query, missing ? [] : assets),
      answer: missing ? "이전에 보신 자산의 자료를 현재 조회할 수 없어 다른 물건으로 대신 비교하지 않았습니다."
        : "어느 자산에 대한 질문인지 먼저 확인하고 싶습니다.",
      clarification: "목록에서 자산 이름을 알려주시겠어요?" };
    const result = await runAdvisorSearch("that one", [], { locale: "en", provider: "openrouter",
      apiKey: "fake", model: "fake", preparedSearch,
      review: { assetIds: missing ? ["MISSING"] : [], needsClarification: true },
      fetch: async () => { calls++; throw new Error("Must not call"); } });
    assert.equal(calls, 0);
    assert.match(result.clarification, /asset.*name|name.*asset/i);
    assert.doesNotMatch(result.answer + result.clarification, /Found|expand|No candidates|adjust the conditions/);
    assert.doesNotMatch(result.answer + result.clarification, hangul);
    if (missing) assert.match(result.answer, /unavailable|cannot.*access/i);
  }
});

test("unavailable review provider retains previous-candidate semantics and display order", async () => {
  for (const provider of ["disabled", "openrouter"]) {
    const preparedSearch = { ...searchAssets(query, assets),
      answer: "이전에 보신 후보를 기준으로 이어서 검토합니다. 임대수입과 비용 근거가 없는 항목은 확인이 필요합니다.",
      clarification: null };
    let calls = 0;
    const result = await runAdvisorSearch("review second", [], { locale: "en", provider,
      apiKey: "fake", model: "fake", preparedSearch, review: { assetIds: ["EN-B"], needsClarification: false },
      fetch: async () => { calls++; return new Response(null, { status: 503 }); } });
    assert.match(result.answer, /previous|previously/i);
    assert.match(result.answer, /income.*cost|income.*expense/i);
    assert.doesNotMatch(result.answer, /Found|No candidates|expand/);
    assert.equal(result.clarification, null);
    assert.deepEqual(result.matches.map(a => a.id), ["EN-A", "EN-B"]);
    assert.equal(calls, provider === "disabled" ? 0 : 1);
  }
});

test("English OpenRouter retains supplied USD and KRW references, dates and source guards", async () => {
  const preparedSearch = searchAssets(query, assets);
  preparedSearch.matches[0].priceUsdReference = { amount: 480, provider: "test-rate", asOf: "2026-10-11" };
  preparedSearch.matches[0].sourceUrl = "https://example.test/listing";
  preparedSearch.rate = { krwPerUsd: 1400, asOf: "2026-10-11T00:00:00Z", rates: { USD: 1, KRW: 1400 } };
  let body;
  const result = await runAdvisorSearch(query, assets, {
    locale: "en", provider: "openrouter", apiKey: "fake", model: "fake", preparedSearch,
    fetch: async (_url, init) => {
      body = JSON.parse(init.body);
      return Response.json(payload("openrouter", { answer: "See https://invented.test/listing",
        clarification: null, selectedAssetIds: ["EN-A"], reasons: [] }));
    },
  });
  const input = JSON.parse(body.messages[1].content);
  assert.deepEqual(input.candidates[0].priceUsdReference, preparedSearch.matches[0].priceUsdReference);
  assert.equal(input.candidates[0].priceKrwReference.amount, 672000);
  assert.equal(input.candidates[0].priceKrwReference.currency, "KRW");
  assert.equal(input.candidates[0].priceKrwReference.asOf, preparedSearch.rate.asOf);
  assert.equal(input.candidates[0].locationLabel, "BKK1, Phnom Penh, Cambodia");
  assert.deepEqual(input.exchangeRate.rates, preparedSearch.rate.rates);
  assert.equal(result.advisor.failure.code, "ungrounded_link");
  assert.doesNotMatch(result.answer, hangul);
});

test("English review keeps displayed order and clarification performs no provider call", async () => {
  const preparedSearch = searchAssets(query, assets);
  let calls = 0;
  const options = { locale: "en", provider: "openrouter", apiKey: "fake", model: "fake", preparedSearch,
    fetch: async () => {
      calls++;
      return Response.json(payload("openrouter", { answer: "Discussing the second candidate, not replacing the list.",
        clarification: null, selectedAssetIds: ["EN-B"], reasons: [] }));
    } };
  const result = await runAdvisorSearch(query, assets, { ...options, review: { assetIds: ["EN-B"], needsClarification: false } });
  assert.equal(result.advisor.mode, "openrouter");
  assert.deepEqual(result.matches.map(a => a.id), ["EN-A", "EN-B"]);
  const clarification = await runAdvisorSearch(query, assets, { ...options, review: { assetIds: [], needsClarification: true } });
  assert.equal(calls, 1);
  assert.equal(clarification.advisor.mode, "rules");
  assert.doesNotMatch(clarification.answer, hangul);
});

for (const provider of ["openai", "openrouter", "gemini"]) {
  test(`${provider} puts English instruction last and preserves schema IDs and selected order`, async () => {
    let body;
    const result = await runAdvisorSearch(query, assets, {
      locale: "en", provider, apiKey: "fake", model: "fake-model",
      fetch: async (_url, init) => {
        body = JSON.parse(init.body);
        return Response.json(payload(provider, { answer: "Two candidates need lease checks.",
          clarification: "Which district do you prefer?", selectedAssetIds: ["EN-B", "EN-A"],
          reasons: [{ assetId: "EN-B", items: ["Within budget"] }] }));
      },
    });
    assert.equal(result.advisor.mode, provider);
    assert.deepEqual(result.matches.map(a => a.id), ["EN-B", "EN-A"]);
    assert.deepEqual(result.matches.map(a => a.price), [500, 480]);
    const instruction = body.instructions ?? body.system_instruction ?? body.messages[0].content;
    assert.match(instruction.split("\n").at(-1), /English/);
    assert.match(instruction.split("\n").at(-1), /answer.*clarification.*reason/i);
    assert.match(instruction.split("\n").at(-1), /approximate USD/);
    assert.match(instruction.split("\n").at(-1), /Never invent.*conversion/);
    assert.doesNotMatch(result.matches.flatMap(a => a.matchReasons).join(" "), hangul);
    const schema = body.text?.format.schema ?? body.response_format.schema ?? body.response_format.json_schema.schema;
    assert.deepEqual(schema.properties.selectedAssetIds.items.enum, ["EN-A", "EN-B"]);
  });

  for (const failure of ["http", "invalid-id", "assurance", "throw"]) {
    test(`${provider} ${failure} uses English grounded fallback`, async () => {
      const result = await runAdvisorSearch(query, assets, {
        locale: "en", provider, apiKey: "fake", model: "fake-model",
        fetch: async () => {
          if (failure === "throw") throw new Error("Fake outage");
          if (failure === "http") return new Response(null, { status: 503 });
          return Response.json(payload(provider, { answer: failure === "assurance" ? "Guaranteed returns" : "Candidate",
            clarification: null, selectedAssetIds: [failure === "invalid-id" ? "UNKNOWN" : "EN-A"], reasons: [] }));
        },
      });
      assert.equal(result.advisor.mode, "rules");
      assert.doesNotMatch(result.answer, hangul);
      assert.deepEqual(result.matches.map(a => a.id), ["EN-A", "EN-B"]);
    });
  }
}
