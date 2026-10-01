import assert from "node:assert/strict";
import test from "node:test";
import { interpretConsultation, validateIntent } from "../lib/consultation-intent.ts";
import { prepareConsultationSearch } from "../lib/consultation-search.ts";
import { extractCriteria, parseSearchContext } from "../lib/search.ts";

const plan = (overrides = {}) => ({
  transaction: "sale", purpose: "income", propertyType: null, bedrooms: null,
  wantsRiver: false, wantsShortStay: false,
  consultation: {
    budget: { amount: 100_000_000, currency: "KRW", scope: "totalInvestment" },
    targetMonthlyIncome: { amount: 1_000_000, currency: "KRW", basis: "unspecified" },
    completedOnly: false, tenantedOnly: false, furnishedOnly: false, cashPurchase: false,
  }, ...overrides,
});
const reply = (content) => Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(content) } }], usage: { cost: 0.001 } });
const options = { provider: "openrouter", apiKey: "test-only", model: "test/astra" };

test("income goal stays separate from acquisition budget and geography is server-owned", async () => {
  const result = await interpretConsultation("시하누크빌에 1억 투자해서 월 100만원 받을 수 있어?", {
    ...options, fetch: async (_url, init) => {
      const request = JSON.parse(init.body);
      assert.equal(request.model, "test/astra");
      assert.equal(request.provider.allow_fallbacks, false);
      assert.equal(JSON.parse(request.messages[1].content).geographicBoundary.city, "Sihanoukville");
      return reply(plan());
    },
  });
  assert.equal(result.mode, "ai");
  assert.equal(result.criteria.transaction, "sale");
  assert.equal(result.criteria.budgetKrw, 100_000_000);
  assert.equal(result.criteria.consultation.targetMonthlyIncome.amount, 1_000_000);
  assert.equal(result.criteria.maxPriceUsd, Math.round(100_000_000 / 1380));
  assert.equal(result.criteria.city, "Sihanoukville");
});

test("follow-up retains prior state, updates total budget and carries unverified preferences", async () => {
  const context = validateIntent(plan(), extractCriteria("프놈펜에 투자"));
  const next = plan();
  next.consultation.budget.amount = 60_000_000;
  next.consultation.completedOnly = true;
  next.consultation.cashPurchase = true;
  const result = await interpretConsultation("총 6000만원으로 완공된 것만 현금 매수할래", {
    ...options, context, conversation: [{ role: "user", text: "월 100만원 받고 싶어" }],
    fetch: async (_url, init) => {
      const input = JSON.parse(JSON.parse(init.body).messages[1].content);
      assert.deepEqual(input.previousCriteria, context);
      assert.equal(input.recentConversation.length, 1);
      return reply(next);
    },
  });
  assert.equal(result.criteria.city, "Phnom Penh");
  assert.equal(result.criteria.budgetKrw, 60_000_000);
  assert.equal(result.criteria.consultation.targetMonthlyIncome.amount, 1_000_000);
  assert.equal(result.criteria.consultation.completedOnly, true);
  assert.deepEqual(parseSearchContext(result.criteria), result.criteria);
});

test("tenant rent budget is monthly and unrelated to investment income", async () => {
  const next = plan({ transaction: "rent", purpose: "residence", bedrooms: 2 });
  next.consultation.budget = { amount: 700, currency: "USD", scope: "monthlyRent" };
  next.consultation.targetMonthlyIncome = null;
  next.consultation.furnishedOnly = true;
  const result = await interpretConsultation("시하누크빌에서 월 700달러 이하 가구 포함 2베드 임대", {
    ...options, fetch: async () => reply(next),
  });
  assert.equal(result.criteria.transaction, "rent");
  assert.equal(result.criteria.maxPriceUsd, 700);
  assert.equal(result.criteria.consultation.targetMonthlyIncome, null);
});

test("rejects invalid plans, geographic overrides, contradictory budget roles and extra tool fields", () => {
  const boundary = extractCriteria("베트남에 투자");
  for (const bad of [
    { ...plan(), city: "Phnom Penh" }, { ...plan(), url: "https://example.com" },
    { ...plan(), transaction: "rent" }, { ...plan(), bedrooms: -1 },
    { ...plan(), consultation: { ...plan().consultation, completedOnly: "yes" } },
    { ...plan(), consultation: { ...plan().consultation, budget: { amount: -5, currency: "USD", scope: "purchase" } } },
    { ...plan(), consultation: { ...plan().consultation, budget: { amount: 100_000_000_000, currency: "USD", scope: "purchase" } } },
  ]) assert.equal(validateIntent(bad, boundary), null);
});

test("reset drops previous conversation and context before planning", async () => {
  const context = validateIntent(plan(), extractCriteria("시하누크빌 투자"));
  await interpretConsultation("처음부터 베트남에서 찾아줘", {
    ...options, context, conversation: [{ role: "user", text: "시하누크빌" }],
    fetch: async (_url, init) => {
      const input = JSON.parse(JSON.parse(init.body).messages[1].content);
      assert.equal(input.reset, true);
      assert.equal(input.previousCriteria, null);
      assert.deepEqual(input.recentConversation, []);
      assert.equal(input.geographicBoundary.country, "Vietnam");
      return reply(plan());
    },
  });
});

test("disabled mode makes no call and failures do not leak provider details or auto-retry", async () => {
  let calls = 0;
  const fetch = async () => { calls++; return Response.json({ error: "test-only secret" }, { status: 401 }); };
  await interpretConsultation("투자", { ...options, provider: "disabled", fetch });
  assert.equal(calls, 0);
  const result = await interpretConsultation("시하누크빌 투자", { ...options, fetch });
  assert.equal(calls, 1);
  assert.equal(result.mode, "rules");
  assert.equal(result.failure, "http_401");
  assert.doesNotMatch(JSON.stringify(result), /test-only|secret/);
  assert.equal(result.criteria.city, "Sihanoukville");
});

test("retrieval and ranking consume the same plan, without budget or city relaxation", async () => {
  const steps = [];
  const next = plan();
  next.consultation.budget = { amount: 50_000, currency: "USD", scope: "purchase" };
  const fixture = {
    id: "EVAL", country: "Cambodia", city: "Sihanoukville", district: "", transaction: "sale",
    propertyType: "condo", price: 49_000, currency: "USD", bedrooms: 1, areaSqm: 30,
    title: "Synthetic unit", summary: "", trustScore: 70, isGliDirect: false,
  };
  const result = await prepareConsultationSearch("시하누크빌에서 월세 잘 받는 투자", {
    ...options, fetch: async () => { steps.push("intent"); return reply(next); },
  }, async (criteria) => {
    steps.push("retrieval");
    assert.equal(criteria.transaction, "sale");
    assert.equal(criteria.maxPriceUsd, 50_000);
    return [fixture, { ...fixture, id: "OVER", price: 70_000 }, { ...fixture, id: "WRONG_CITY", city: "Phnom Penh" }];
  });
  assert.deepEqual(steps, ["intent", "retrieval"]);
  assert.equal(result.preparedSearch.criteria, result.intent.criteria);
  assert.deepEqual(result.preparedSearch.matches.map(x => x.id), ["EVAL"]);
  const empty = await prepareConsultationSearch("시하누크빌 투자", {
    ...options, fetch: async () => reply(next),
  }, async () => [{ ...fixture, price: 70_000 }]);
  assert.deepEqual(empty.preparedSearch.matches, []);
});

test("rule fallback preserves investment intent for immediate-income follow-up", () => {
  const previous = extractCriteria("프놈펜에서 5000만원으로 투자");
  const next = extractCriteria("즉시 월세가 나오는 것으로", previous);
  assert.equal(next.transaction, "sale");
  assert.equal(next.purpose, "income");
  assert.equal(next.budgetKrw, 50_000_000);
});
