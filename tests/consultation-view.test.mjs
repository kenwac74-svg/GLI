import assert from "node:assert/strict";
import test from "node:test";
import { summaryOf, displayResult, localizeDemoResult, localizeDemoTurn, safeSourceUrl, answerParagraphs, candidateConverted, conditionChips } from "../lib/consultation-view.ts";
import { candidateLocation, localizeSeparatedGeography } from "../lib/location-display.ts";

const matches = ["c", "a", "d", "b"].map(id => ({ id, title: id, price: 500, currency: "USD", transaction: "rent" }));
const result = { matches, answer: "answer", clarification: null, resultSet: { assetIds: matches.map(x => x.id), returnedCount: 4 } };
test("summary is capped at three without capping or reordering full results", () => {
  assert.deepEqual(summaryOf(result).leads.map(l => [l.asset.id, l.rank]), [["c",1],["a",2],["d",3]]);
  assert.equal(summaryOf(result).count, 4);
});
test("review/missing/clarify retain prior order and restrict summary to known references", () => {
  const next = displayResult({ ...result, matches: [], consultation: { mode: "review", referencedAssetIds: ["b", "a", "missing"], missingAssetIds: ["missing"] } }, result);
  assert.deepEqual(next.matches, result.matches);
  assert.deepEqual(summaryOf(next).leads.map(l => [l.asset.id,l.rank]), [["a",2],["b",4]]);
  assert.equal(summaryOf(next).missing, 1);
  assert.equal(summaryOf({ ...next, consultation: { mode: "clarify", referencedAssetIds: [], missingAssetIds: [] } }).leads.length, 0);
});

test("review retains fresh translations without adding or reordering candidates", () => {
  const fresh = { ...matches[1], title: "번역된 자산", matchReasons: ["최신 검토 근거"] };
  const next = displayResult({ ...result, matches: [fresh, { ...matches[0], id: "unrequested" }],
    consultation: { mode: "review", referencedAssetIds: ["a"], missingAssetIds: [] } }, result);
  assert.deepEqual(next.matches.map(asset => asset.id), ["c", "a", "d", "b"]);
  assert.equal(next.matches[1].title, fresh.title);
  assert.equal(next.matches[0], matches[0]);
  assert.equal(next.resultSet, result.resultSet);
});

test("saved demo answers, titles and citation labels localize without rewriting user input or source identity", () => {
  const title = "Central Phnom Penh studio residence";
  const original = { ...result, matches: [{ ...matches[0], id: "GLI-KH-101", title }],
    answer: `${title} 후보입니다.`, citations: [{ assetId: "GLI-KH-101", label: `Boeng Reang · ${title}` }] };
  const localized = localizeDemoResult(original);
  assert.equal(localized.matches[0].title, "프놈펜 중심부 스튜디오 레지던스");
  assert.match(localized.answer, /^프놈펜/);
  assert.match(localized.citations[0].label, /Boeng Reang · 프놈펜/);
  assert.equal(original.matches[0].title, title);
  assert.equal(localized.matches[0].sourceUrl, undefined);
  assert.equal(localizeDemoResult(localized), localized);
  assert.match(localizeDemoTurn({ id: "1-answer", role: "GLI AI", text: original.answer, result: original }).text, /^프놈펜/);
  const user = { id: "1-query", role: "나", text: title };
  assert.equal(localizeDemoTurn(user), user);
});
test("citations use asset/url/label identity and reject unsafe schemes", () => {
  const citations = [{ assetId: "c", label: "Source", url: "https://example.com/1" }, { assetId: "a", label: "Source", url: "https://example.com/1" }];
  assert.equal(summaryOf({ ...result, citations: [...citations, citations[0], { assetId: "unknown", label: "invalid" }] }).citations.length, 2);
  assert.equal(safeSourceUrl("javascript:alert(1)"), undefined);
});
test("paragraphs preserve trailing unpunctuated content and monetary chips stay separate", () => {
  const text = "First.\n\nLast sentence without punctuation";
  assert.equal(answerParagraphs(text).join("").replaceAll(/\s/g,""), text.replaceAll(/\s/g,""));
  const chips = conditionChips({ country: "Cambodia", city: "Sihanoukville", consultation: {
    budget: { amount: 60000000, currency: "KRW", scope: "totalInvestment" },
    targetMonthlyIncome: { amount: 1000000, currency: "KRW", basis: "net" },
  } });
  assert.ok(chips.some(c => c.startsWith("총예산")));
  assert.ok(chips.some(c => c.startsWith("목표 월수입")));
  assert.equal(candidateConverted({ ...matches[0], maxPrice: 600 }, { krwPerUsd: 1380 }), "약 690,000~828,000원/월");
});

test("VND conversion uses observed cross rates for both range endpoints, without treating VND as USD", () => {
  const asset = { ...matches[0], price: 27000000, maxPrice: 28000000, currency: "VND" };
  const rate = { krwPerUsd: 1350, asOf: "2026-10-01", rates: { USD: 1, VND: 25000, KRW: 1350 } };
  assert.equal(candidateConverted(asset, rate), "약 1,458,000~1,512,000원/월");
  assert.equal(candidateConverted(asset, { krwPerUsd: 1350 }), "");
  assert.equal(candidateConverted(asset, { ...rate, rates: { ...rate.rates, VND: 0 } }), "");
  assert.equal(candidateConverted({ ...asset, currency: "KRW" }, rate), "");
});

test("Korean geography projection preserves compound brands, quotes, URLs and canonical fields", () => {
  assert.equal(localizeSeparatedGeography("R&F City, Phnom Penh"), "R&F City, 프놈펜");
  for (const name of ['"R&F City, Phnom Penh"', "R&F City Phnom Penh", "R&FCityPhnomPenh", "https://example.test/Vietnam/"]) {
    assert.equal(localizeSeparatedGeography(name), name);
  }
  const asset = { ...matches[0], title: "Ho Chi Minh, An Phu, Lumiere Riverside의 침실 2개 콘도 임대",
    country: "Vietnam", city: "Ho Chi Minh City", district: "District 2" };
  const localized = localizeDemoResult({ ...result, matches: [asset], answer: asset.title });
  assert.equal(localized.matches[0].title, "호치민, 안푸, Lumiere Riverside의 침실 2개 콘도 임대");
  assert.equal(localized.matches[0].city, asset.city);
  assert.equal(candidateLocation(asset), "2군, 호치민, 베트남");
  assert.equal(conditionChips({ country: "Vietnam", city: "Ho Chi Minh City" })[0], "베트남 호치민");
  assert.equal(localizeDemoResult(localized), localized);
});
