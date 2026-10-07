// 후속 질문의 서수 참조("첫 번째 후보")가 직전 목록의 자산으로 해석되는지 검증한다.
import assert from "node:assert/strict";
import test from "node:test";

import { resolveFollowupReference } from "../lib/followup-reference.ts";
import { runAdvisorSearch } from "../lib/ai-search.ts";

const ids = ["A", "B", "C"];

test("resolves Korean and numeric ordinals against the previous list", () => {
  assert.equal(resolveFollowupReference("그중 첫 번째 후보 확인해 줘", ids), "A");
  assert.equal(resolveFollowupReference("두번째 매물은 어때?", ids), "B");
  assert.equal(resolveFollowupReference("3번째 자산 설명해줘", ids), "C");
  assert.equal(resolveFollowupReference("마지막 후보로 해줘", ids), "C");
});

test("returns null when there is no reference, no list, or the ordinal is out of range", () => {
  assert.equal(resolveFollowupReference("2베드 임대 찾아줘", ids), null);
  assert.equal(resolveFollowupReference("첫 번째 후보", []), null);
  assert.equal(resolveFollowupReference("다섯 번째 후보", ids), null);
});

const asset = (id, district) => ({
  id,
  country: "Cambodia",
  countryCode: "KH",
  city: "Phnom Penh",
  district,
  transaction: "rent",
  propertyType: "condo",
  bedrooms: 1,
  bathrooms: 1,
  title: `${district} 1BR`,
  price: 600,
  currency: "USD",
  areaSqm: 50,
  image: "https://example.test/x.jpg",
  summary: "Residence",
  trustScore: 70,
  trustStatus: "REVIEWING",
  isGliDirect: false,
  updatedAt: "2026-07-31T00:00:00.000Z",
  strengths: [`${district} 강점`],
  checks: [`${district} 확인`],
});

test("pins the referenced asset first and answers from stored fields", async () => {
  const assets = [asset("A", "BKK1"), asset("B", "BKK3")];
  const result = await runAdvisorSearch("그중 두 번째 후보 확인해 줘", assets, {
    provider: "disabled",
    focusAssetId: "B",
  });
  assert.equal(result.matches[0].id, "B");
  assert.match(result.answer, /BKK3 1BR/);
  assert.match(result.answer, /BKK3 확인/);
});

test("ignores a focus asset id that is not in the candidate set", async () => {
  const assets = [asset("A", "BKK1")];
  const base = await runAdvisorSearch("1베드 임대", assets, { provider: "disabled" });
  const focused = await runAdvisorSearch("1베드 임대", assets, {
    provider: "disabled",
    focusAssetId: "ZZZ",
  });
  assert.deepEqual(focused.matches, base.matches);
  assert.equal(focused.answer, base.answer);
});
