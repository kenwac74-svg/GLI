import assert from "node:assert/strict";
import { loadEnvFile } from "node:process";
import { mkdir, writeFile } from "node:fs/promises";
import { prepareConsultationSearch } from "../lib/consultation-search.ts";
import { runAdvisorSearch } from "../lib/ai-search.ts";
import { extractCriteria } from "../lib/search.ts";

// Synthetic GLI QA only. Two turns, at most four paid calls, no web collection.
if (!process.argv.includes("--run")) {
  console.log("Dry run: previous-candidate discussion; at most four paid calls.");
} else {
  loadEnvFile(".env.local");
  assert.equal(process.env.LLM_PROVIDER, "openrouter");
  const assets = ["A", "B"].map((suffix, index) => ({
    id: `EVAL-REFERENCE-${suffix}`, country: "Cambodia", countryCode: "KH", city: "Phnom Penh", district: "BKK1",
    transaction: "sale", propertyType: "condo", bedrooms: 1, bathrooms: 1, price: 65_000 + index * 5_000,
    currency: "USD", areaSqm: 40, title: `QA residence ${suffix} (synthetic)`, image: "",
    summary: "Synthetic QA evidence. Source says sold occupied and conventional mortgage is unavailable. Lease and rent unknown.",
    checks: ["Verify occupant rights and actual lease before purchase", "Operating expenses unknown"], strengths: [],
    sourceName: "GLI QA synthetic evidence", sourceUrl: `https://example.com/gli-qa/${suffix}`,
    trustScore: 60, trustStatus: "REVIEWING", isGliDirect: false, updatedAt: "2026-09-18T00:00:00Z",
  }));
  const references = assets.map(asset => ({ id: asset.id, asset }));
  let context = extractCriteria("프놈펜에 1억원 정도 투자");
  const conversation = [];
  const report = [];
  for (const query of [
    "두 번째 물건의 가격과 출처, 중요한 위험을 알려줘. 새 물건은 찾지 마.",
    "총예산을 부대비용 포함 6000만원으로 낮추고 순수익 월 100만원이 목표야. 아까 두 후보만 비교하고 비용을 모르면 지어내지 마.",
  ]) {
    const start = Date.now();
    const prepared = await prepareConsultationSearch(query, { provider: "openrouter", context, references, conversation }, async () => assert.fail("Unexpected retrieval"));
    assert.equal(prepared.intent.mode, "ai", prepared.intent.failure);
    assert.equal(prepared.review.needsClarification, false);
    const result = await runAdvisorSearch(query, assets, { provider: "openrouter", preparedSearch: prepared.preparedSearch, review: prepared.review, conversation });
    assert.equal(result.advisor.mode, "openrouter", result.advisor.failure?.code);
    assert.deepEqual(result.matches.map(asset => asset.id), assets.map(asset => asset.id));
    if (report.length === 0) assert.deepEqual(result.advisor.groundedAssetIds, [assets[1].id]);
    else {
      assert.equal(result.criteria.consultation.budget.amount, 60_000_000);
      assert.equal(result.criteria.consultation.targetMonthlyIncome.amount, 1_000_000);
      assert.equal(result.criteria.consultation.targetMonthlyIncome.basis, "net");
    }
    report.push({ query, answer: result.answer, clarification: result.clarification, citations: result.citations,
      referencedAssetIds: prepared.review.assetIds, criteria: result.criteria, elapsedMs: Date.now() - start,
      costUsd: (prepared.intent.costUsd ?? 0) + (result.advisor.usage?.costUsd ?? 0) });
    console.log(JSON.stringify({ turn: report.length, passed: true, elapsedMs: Date.now() - start, costUsd: report.at(-1).costUsd }));
    context = result.criteria;
    conversation.push({ role: "user", text: query }, { role: "assistant", text: result.answer.slice(0, 1200) });
  }
  await mkdir("work/advisor-comparisons", { recursive: true });
  const path = `work/advisor-comparisons/references-${new Date().toISOString().replaceAll(":", "-")}.json`;
  await writeFile(path, JSON.stringify({ synthetic: true, model: process.env.OPENROUTER_MODEL, report }, null, 2));
  console.log(JSON.stringify({ path, costUsd: report.reduce((sum, turn) => sum + turn.costUsd, 0) }));
}
