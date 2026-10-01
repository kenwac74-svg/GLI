import assert from "node:assert/strict";
import test from "node:test";
import { interpretConsultation } from "../lib/consultation-intent.ts";
import { prepareConsultationSearch } from "../lib/consultation-search.ts";
import { mayNeedTransactionClarification } from "../lib/jev-routing.ts";

const options = { provider: "openrouter", apiKey: "test-key", model: "test/astra" };
const plan = {
  transaction: "sale", purpose: "income", propertyType: null, bedrooms: null,
  wantsRiver: false, wantsShortStay: false,
  consultation: {
    budget: null, targetMonthlyIncome: null, completedOnly: false,
    tenantedOnly: false, furnishedOnly: false, cashPurchase: false,
  },
};
const astralReply = () => Response.json({
  choices: [{ finish_reason: "stop", message: { content: JSON.stringify(plan) } }],
});
const decisionReply = (choice, probability = 0.99, confidence = 0.95) => Response.json({
  answers: { next_step: { type: "choice", choice,
    probabilities: { clarify: probability, continue: 1 - probability, complex: 0 }, confidence } },
  usage: { input_tokens: 130, output_tokens: 20, cost: 0.00001 },
});

test("Jev only evaluates a bounded first-turn buy-or-rent ambiguity", () => {
  assert.equal(mayNeedTransactionClarification("프놈펜 부동산 물건 찾아줘", false, null), true);
  assert.equal(mayNeedTransactionClarification("프놈펜 부동산 물건 찾아줘", true, null), false);
  assert.equal(mayNeedTransactionClarification("프놈펜 부동산 투자 물건 찾아줘", false, "sale"), false);
  assert.equal(mayNeedTransactionClarification("프놈펜에서 거주할 집 찾아줘", false, null), false);
  assert.equal(mayNeedTransactionClarification("프놈펜에 1억으로 집 찾아줘", false, null), false);
  assert.equal(mayNeedTransactionClarification("부동산 물건 찾아줘", false, null), false);
});

test("high-confidence ambiguity asks one question before retrieval or Astra", async () => {
  let decisionCalls = 0;
  const result = await prepareConsultationSearch("프놈펜 부동산 물건 찾아줘", {
    ...options,
    decisionFetch: async (url, init) => {
      decisionCalls++;
      assert.equal(url, "https://openrouter.ai/api/alpha/decisions");
      const request = JSON.parse(init.body);
      assert.equal(request.model, "typesafe/jev-1.13");
      assert.deepEqual(Object.keys(request.state), ["question"]);
      return decisionReply("clarify");
    },
    fetch: async () => { throw new Error("Astra must not run"); },
  }, async () => { throw new Error("Retrieval must not run"); });
  assert.equal(decisionCalls, 1);
  assert.equal(result.intent.mode, "rules");
  assert.equal(result.preparedSearch.answer, "매입할 물건을 찾으시나요, 아니면 거주할 집을 임차하려는 건가요?");
  assert.deepEqual(result.preparedSearch.matches, []);
});

test("uncertain or unavailable Jev returns to the existing counselor once", async () => {
  for (const decisionFetch of [
    async () => decisionReply("clarify", 0.83, 0.9),
    async () => Response.json({ error: "unavailable" }, { status: 503 }),
  ]) {
    let planningCalls = 0;
    let retrievalCalls = 0;
    const result = await prepareConsultationSearch("프놈펜 부동산 물건 찾아줘", {
      ...options, decisionFetch,
      fetch: async () => { planningCalls++; return astralReply(); },
    }, async () => { retrievalCalls++; return []; });
    assert.equal(planningCalls, 1);
    assert.equal(retrievalCalls, 1);
    assert.equal(result.intent.mode, "ai");
    assert.equal(result.intent.clarification, undefined);
  }
});

test("explicit investment question does not add a Jev round trip", async () => {
  let decisions = 0;
  const result = await interpretConsultation("프놈펜에서 투자할 부동산 찾아줘", {
    ...options,
    decisionFetch: async () => { decisions++; return decisionReply("clarify"); },
    fetch: async () => astralReply(),
  });
  assert.equal(decisions, 0);
  assert.equal(result.mode, "ai");
  assert.equal(result.criteria.transaction, "sale");
});
