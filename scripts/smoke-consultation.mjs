import assert from "node:assert/strict";
import { loadEnvFile } from "node:process";
import { mkdir, writeFile } from "node:fs/promises";
import { prepareConsultationSearch } from "../lib/consultation-search.ts";
import { runAdvisorSearch } from "../lib/ai-search.ts";

// Internal synthetic evidence only; opt-in, bounded at six OpenRouter calls.
if (!process.argv.includes("--run")) {
  console.log("Dry run: three consultation turns, at most six paid calls. Use --run to execute.");
} else {
  loadEnvFile(".env.local");
  assert.equal(process.env.LLM_PROVIDER, "openrouter");
  assert.equal(process.env.OPENROUTER_MODEL, "openai/gpt-6-astra");
  const queries = [
    "프놈펜에서 5000만원 정도 투자해서 월세를 잘 받을 만한 물건을 찾고 있어.",
    "취득 부대비용까지 총 6000만원으로 할게. 완공된 것만 현금으로 사고 싶고 월 100만원은 표면 월세 기준이야.",
    "지역은 그대로 유지하고, 지금 세입자가 있어서 임대차 계약을 승계할 수 있는 것만 보고 싶어.",
  ];
  const fixture = {
    id: "EVAL-INTENT-A", country: "Cambodia", countryCode: "KH", city: "Phnom Penh", district: "BKK3",
    transaction: "sale", propertyType: "condo", bedrooms: 1, bathrooms: 1,
    price: 40_000, currency: "USD", areaSqm: 30, title: "Test residence A (synthetic)",
    summary: "Synthetic comparison only. Completion, tenancy, monthly rent and acquisition fees are unknown.",
    trustScore: 60, trustStatus: "REVIEWING", isGliDirect: false,
    image: "", updatedAt: "2026-09-18T00:00:00Z", strengths: [], checks: ["Completion and tenancy unverified"],
  };
  const report = [];
  const conversation = [];
  let context = null;
  for (const [index, query] of queries.entries()) {
    const start = Date.now();
    const prepared = await prepareConsultationSearch(query, { provider: "openrouter", context, conversation }, async () => [fixture]);
    assert.equal(prepared.intent.mode, "ai", prepared.intent.failure);
    assert.equal(prepared.intent.criteria.transaction, "sale");
    assert.equal(prepared.intent.criteria.purpose, "income");
    assert.equal(prepared.intent.criteria.city, "Phnom Penh");
    assert.equal(prepared.intent.criteria.budgetKrw, index === 0 ? 50_000_000 : 60_000_000);
    if (index > 0) {
      assert.equal(prepared.intent.criteria.consultation.targetMonthlyIncome.amount, 1_000_000);
      assert.equal(prepared.intent.criteria.consultation.targetMonthlyIncome.basis, "gross");
      assert.equal(prepared.intent.criteria.consultation.completedOnly, true);
      assert.equal(prepared.intent.criteria.consultation.cashPurchase, true);
    }
    if (index === 2) assert.equal(prepared.intent.criteria.consultation.tenantedOnly, true);
    const result = await runAdvisorSearch(query, prepared.assets, {
      provider: "openrouter", context, conversation, preparedSearch: prepared.preparedSearch,
    });
    assert.equal(result.advisor.mode, "openrouter", result.advisor.failure?.code);
    assert.deepEqual(result.criteria, prepared.intent.criteria);
    report.push({ query, criteria: result.criteria, answer: result.answer, clarification: result.clarification,
      matches: result.matches.map(x => x.id), intentCostUsd: prepared.intent.costUsd ?? null,
      advisorCostUsd: result.advisor.usage?.costUsd ?? null, elapsedMs: Date.now() - start });
    console.log(JSON.stringify({ turn: index + 1, passed: true, elapsedMs: Date.now() - start,
      costUsd: (prepared.intent.costUsd ?? 0) + (result.advisor.usage?.costUsd ?? 0) }));
    context = result.criteria;
    conversation.push({ role: "user", text: query }, { role: "assistant", text: result.answer.slice(0, 1200) });
  }
  await mkdir("work/advisor-comparisons", { recursive: true });
  const path = `work/advisor-comparisons/intent-${new Date().toISOString().replaceAll(":", "-")}.json`;
  await writeFile(path, JSON.stringify({ model: process.env.OPENROUTER_MODEL, synthetic: true, report }, null, 2));
  console.log(JSON.stringify({ path, turns: report.length, costUsd: report.reduce((s, r) => s + (r.intentCostUsd ?? 0) + (r.advisorCostUsd ?? 0), 0) }));
}
