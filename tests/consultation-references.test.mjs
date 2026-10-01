import assert from "node:assert/strict";
import test from "node:test";
import { parseAssetReferences, referenceHint, resolveAssetReferences } from "../lib/consultation-references.ts";
import { prepareConsultationSearch } from "../lib/consultation-search.ts";
import { runAdvisorSearch } from "../lib/ai-search.ts";
import { extractCriteria } from "../lib/search.ts";

const unit = (id, overrides = {}) => ({
  id, country: "Cambodia", countryCode: "KH", city: "Phnom Penh", district: "BKK1",
  transaction: "sale", propertyType: "condo", price: 65_000, currency: "USD",
  bedrooms: 1, bathrooms: 1, areaSqm: 40, title: `Test ${id}`, summary: "Source says sold occupied.",
  image: "", trustScore: 70, trustStatus: "review", isGliDirect: false, updatedAt: "2026-09-18",
  strengths: [], checks: ["Verify occupant and lease terms before purchase"],
  detailFacts: [{ label: "Finance", value: "Source states conventional mortgage unavailable" }],
  sourceName: "Test portal", sourceUrl: `https://example.com/listing/${id}`,
  ...overrides,
});
const first = unit("FIRST");
const second = unit("SECOND", { price: 70_000 });
const references = [first, second].map(asset => ({ id: asset.id, asset }));
const context = extractCriteria("프놈펜에 1억원 투자");
const plan = (action) => ({
  transaction: "sale", purpose: "income", propertyType: null, bedrooms: null,
  wantsRiver: false, wantsShortStay: false,
  consultation: { budget: { amount: 40_000, currency: "USD", scope: "totalInvestment" },
    targetMonthlyIncome: { amount: 700, currency: "USD", basis: "net" },
    completedOnly: true, tenantedOnly: false, furnishedOnly: false, cashPurchase: true },
  action,
});
const reply = content => Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(content) } }] });

test("only bounded unique public IDs are accepted, no client asset facts", () => {
  assert.deepEqual(parseAssetReferences(undefined), []);
  for (const value of [["A", "A"], ["../secret"], ["https://example.com"], [42], [{ id: "A", price: 1 }], Array.from({ length: 19 }, (_, i) => `A${i}`)]) {
    assert.equal(parseAssetReferences(value), null);
  }
});

test("resolution preserves missing positions and uses server facts", async () => {
  const resolved = await resolveAssetReferences(["GONE", "SECOND"], async id => id === "SECOND" ? second : null);
  assert.equal(resolved[0].asset, null);
  assert.deepEqual(referenceHint("두 번째 물건은?", resolved), { kind: "review", assetIds: ["SECOND"] });
  assert.deepEqual(referenceHint("첫 번째 물건은?", resolved), { kind: "review", assetIds: ["GONE"] });
});

test("review never retrieves, substitutes, price-filters or reorders previous candidates", async () => {
  const prepared = await prepareConsultationSearch("이전 후보만 새 예산으로 비교해줘", {
    provider: "openrouter", apiKey: "test", model: "test/model", context, references,
    fetch: async (_url, init) => {
      const input = JSON.parse(JSON.parse(init.body).messages[1].content);
      assert.deepEqual(input.previousCandidates.map(x => x.id), ["FIRST", "SECOND"]);
      return reply(plan({ kind: "review", assetIds: ["FIRST", "SECOND"] }));
    },
  }, async () => assert.fail("Review must not crawl"));
  assert.equal(prepared.preparedSearch.criteria.maxPriceUsd, 40_000);
  assert.deepEqual(prepared.preparedSearch.matches.map(x => [x.id, x.price]), [["FIRST", 65000], ["SECOND", 70000]]);
  assert.equal(prepared.review.needsClarification, false);
});

test("exact ordinal overrides model replacement; ambiguous ordinal asks", async () => {
  const prepared = await prepareConsultationSearch("두 번째 물건의 위험은?", {
    provider: "openrouter", apiKey: "test", model: "test/model", references, context,
    fetch: async () => reply(plan({ kind: "search", assetIds: [] })),
  }, async () => assert.fail("Must not replace selected asset"));
  assert.deepEqual(prepared.review.assetIds, ["SECOND"]);
  for (const query of ["네 번째 물건은?", "그 물건은 어때?"]) {
    const ambiguous = await prepareConsultationSearch(query, { provider: "disabled", context, references }, async () => assert.fail());
    assert.equal(ambiguous.review.needsClarification, true);
  }
});

test("unavailable or out-of-country references cannot become recommendations", async () => {
  for (const refs of [[{ id: "FIRST", asset: null }], [{ id: "FIRST", asset: unit("FIRST", { country: "Vietnam" }) }]]) {
    const prepared = await prepareConsultationSearch("첫 번째 물건은?", { provider: "disabled", context, references: refs }, async () => assert.fail());
    assert.deepEqual(prepared.review.missingAssetIds, ["FIRST"]);
    const result = await runAdvisorSearch("첫 번째 물건은?", prepared.assets, {
      provider: "openrouter", apiKey: "test", model: "test/model", preparedSearch: prepared.preparedSearch,
      review: prepared.review, fetch: async () => assert.fail("Clarification needs no paid advisor"),
    });
    assert.equal(result.advisor.mode, "rules");
    assert.deepEqual(result.matches, []);
  }
});

test("reset discards selections and resumes retrieval", async () => {
  let calls = 0;
  const prepared = await prepareConsultationSearch("조건 초기화, 시하누크빌 찾아줘", {
    provider: "disabled", context, references, selectedAssetIds: ["SECOND"],
  }, async () => { calls++; return []; });
  assert.equal(calls, 1);
  assert.equal(prepared.review, null);
  assert.equal(prepared.intent.criteria.city, "Sihanoukville");
});

test("review counselor sees only referenced asset with source and adverse conditions; list stays unchanged", async () => {
  const prepared = await prepareConsultationSearch("두 번째 물건의 출처와 리스크는?", { provider: "disabled", context, references }, async () => assert.fail());
  const result = await runAdvisorSearch("두 번째 물건의 출처와 리스크는?", prepared.assets, {
    provider: "openrouter", apiKey: "test", model: "test/model", preparedSearch: prepared.preparedSearch, review: prepared.review,
    fetch: async (_url, init) => {
      const input = JSON.parse(JSON.parse(init.body).messages[1].content);
      assert.deepEqual(input.candidates.map(x => x.id), ["SECOND"]);
      assert.equal(input.candidates[0].source.url, second.sourceUrl);
      assert.deepEqual(input.candidates[0].detailFacts, second.detailFacts);
      assert.deepEqual(input.candidates[0].checks, second.checks);
      assert.equal(input.candidates[0].verifiedOperatingExpenses, null);
      assert.equal(input.candidates[0].verifiedIncomeEvidence, null);
      assert.equal("trustScore" in input.candidates[0], false);
      return reply({ answer: `임차인 조건 확인이 필요합니다. ${second.sourceUrl}`, clarification: null, selectedAssetIds: ["SECOND"], reasons: [] });
    },
  });
  assert.deepEqual(result.matches.map(x => x.id), ["FIRST", "SECOND"]);
  assert.deepEqual(result.advisor.groundedAssetIds, ["SECOND"]);
  assert.equal(result.citations[0].url, second.sourceUrl);
});

test("invented URL and unrelated candidate selection are rejected", async () => {
  const prepared = await prepareConsultationSearch("두 번째 물건은?", { provider: "disabled", context, references }, async () => assert.fail());
  for (const output of [
    { answer: "https://fabricated.example/lease", selectedAssetIds: ["SECOND"] },
    { answer: "First is best", selectedAssetIds: ["FIRST"] },
  ]) {
    const result = await runAdvisorSearch("두 번째 물건은?", prepared.assets, {
      provider: "openrouter", apiKey: "test", model: "test/model", preparedSearch: prepared.preparedSearch, review: prepared.review,
      fetch: async () => reply({ ...output, clarification: null, reasons: [] }),
    });
    assert.equal(result.advisor.mode, "rules");
    assert.deepEqual(result.matches.map(x => x.id), ["FIRST", "SECOND"]);
  }
});
