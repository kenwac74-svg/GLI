import test from "node:test";
import assert from "node:assert/strict";
import { uiLocale, translateUiText } from "../lib/ui-language.ts";
import { candidateConverted, conditionChips, localizeDemoResult } from "../lib/consultation-view.ts";

test("locale is allowlisted and UI copy translation preserves unknown names and numbers", () => {
  assert.equal(uiLocale("en"), "en");
  assert.equal(uiLocale("ko"), "ko");
  assert.equal(uiLocale("fr"), "ko");
  assert.equal(translateUiText("자산 탐색", "en"), "Asset discovery");
  assert.equal(translateUiText("R&F City, Phnom Penh", "en"), "R&F City, Phnom Penh");
  assert.equal(translateUiText(" $450 ", "en"), " $450 ");
  assert.equal(translateUiText("자산 탐색", "ko"), "자산 탐색");
});

test("English restores only a known source-less demo name and displays English criteria", () => {
  const result = { answer: "Original saved answer", clarification: null, matches: [{ id: "GLI-KH-102", title: "프놈펜 중심부 1베드룸 레지던스" }] };
  assert.equal(localizeDemoResult(result, "en").matches[0].title, "Central Phnom Penh 1BR residence");
  assert.equal(localizeDemoResult({ ...result, matches: [{ ...result.matches[0], sourceUrl: "https://example.test/real" }] }, "en").matches[0].title, result.matches[0].title);
  const chips = conditionChips({ country: "Vietnam", city: "Ho Chi Minh City", transaction: "sale", bedrooms: 3, budgetKrw: 200000000,
    consultation: { budget: { amount: 200000000, currency: "KRW", scope: "totalInvestment" }, targetMonthlyIncome: { amount: 1000000, currency: "KRW", basis: "net" } } }, "en");
  assert.deepEqual(chips, ["Vietnam Ho Chi Minh City", "For sale", "Total budget KRW 200,000,000", "Target monthly income KRW 1,000,000", "3 bedrooms"]);
});

test("English candidate display uses observed USD conversion and never Korean title projection", () => {
  const asset = { id: "GLI-KH-102", title: "Central Phnom Penh 1BR residence", price: 25000000, currency: "VND", transaction: "rent" };
  const rate = { krwPerUsd: 1350, asOf: "2026-10-12", rates: { USD: 1, VND: 25000, KRW: 1350 } };
  assert.equal(candidateConverted(asset, rate, "en"), "Approx. $1,000/month");
  assert.equal(candidateConverted({ ...asset, currency: "USD" }, rate, "en"), "");
  const result = { answer: "An English answer", clarification: null, matches: [asset] };
  assert.equal(localizeDemoResult(result, "en"), result);
});
