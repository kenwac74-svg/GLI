import assert from "node:assert/strict";
import test from "node:test";

import {
  extractCriteria,
  parseSearchContext,
  searchAssets,
} from "../lib/search.ts";

const assets = [
  {
    id: "GLI-KH-TONLE",
    country: "Cambodia",
    countryCode: "KH",
    city: "Phnom Penh",
    district: "Tonle Bassac",
    transaction: "rent",
    propertyType: "condo",
    bedrooms: 1,
    bathrooms: 1,
    title: "Tonle Bassac serviced 1BR residence",
    price: 650,
    currency: "USD",
    areaSqm: 62,
    image: "https://example.test/tonle.jpg",
    summary: "Furnished residence",
    trustScore: 65,
    trustStatus: "REVIEWING",
    isGliDirect: false,
    updatedAt: "2026-07-30T00:00:00.000Z",
    strengths: [],
    checks: [],
  },
  {
    id: "GLI-KH-BKK1",
    country: "Cambodia",
    countryCode: "KH",
    city: "Phnom Penh",
    district: "BKK1",
    transaction: "rent",
    propertyType: "condo",
    bedrooms: 1,
    bathrooms: 1,
    title: "BKK1 high-floor 1BR condo",
    price: 600,
    currency: "USD",
    areaSqm: 54,
    image: "https://example.test/bkk1.jpg",
    summary: "Central residence",
    trustScore: 90,
    trustStatus: "VERIFIED",
    isGliDirect: true,
    updatedAt: "2026-07-30T00:00:00.000Z",
    strengths: [],
    checks: [],
  },
];

test("extracts a Phnom Penh district from conversational Korean", () => {
  const criteria = extractCriteria(
    "프놈펜 톤레바삭에서 월 700달러 이하 1베드 임대 매물을 찾아줘",
  );
  assert.equal(criteria.district, "Tonle Bassac");
  assert.equal(criteria.transaction, "rent");
  assert.equal(criteria.maxPriceUsd, 700);
  assert.equal(criteria.bedrooms, 1);
});

test("uses an explicit district as an exact search constraint", () => {
  const result = searchAssets(
    "톤레바삭에서 월 700달러 이하 1베드 임대",
    assets,
  );
  assert.deepEqual(
    result.matches.map((asset) => asset.id),
    ["GLI-KH-TONLE"],
  );
  assert.ok(result.matches[0].matchReasons.includes("Tonle Bassac 지역"));
});

test("keeps prior investment intent when a follow-up adds budget and bedrooms", () => {
  const initial = extractCriteria(
    "겨울마다 3개월 머물고 없을 때는 에어비앤비로 운영할 별장을 찾아줘",
  );
  const followUp = extractCriteria("예산은 1억원이고 2베드가 좋아", initial);

  assert.equal(followUp.purpose, "seasonal");
  assert.equal(followUp.transaction, "sale");
  assert.equal(followUp.wantsShortStay, true);
  assert.equal(followUp.budgetKrw, 100_000_000);
  assert.equal(followUp.bedrooms, 2);
});

test("states when seasonal follow-up results are only nearby alternatives", () => {
  const initial = extractCriteria(
    "겨울마다 3개월 머물고 없을 때는 에어비앤비로 운영할 별장을 찾아줘",
  );
  const result = searchAssets("예산은 1억원이고 2베드가 좋아", assets, initial);

  assert.match(result.answer, /정확히 일치.*없어 가까운 대안/);
  assert.ok(
    result.matches.every((asset) =>
      asset.matchReasons.includes("정확 일치가 없어 가까운 대안"),
    ),
  );
});

test("allows a follow-up to remove an inherited preference", () => {
  const initial = extractCriteria("월 700달러 이하 1베드 강 전망 임대 콘도");
  const followUp = extractCriteria("강 전망은 필요 없어", initial);

  assert.equal(followUp.transaction, "rent");
  assert.equal(followUp.maxPriceUsd, 700);
  assert.equal(followUp.bedrooms, 1);
  assert.equal(followUp.wantsRiver, false);
});

test("validates structured conversational context before reuse", () => {
  const valid = extractCriteria("BKK1에서 월 700달러 이하 1베드 임대");

  assert.deepEqual(parseSearchContext(valid), valid);
  assert.equal(
    parseSearchContext({ ...valid, country: "Thailand" }),
    null,
  );
  assert.equal(
    parseSearchContext({ ...valid, maxPriceUsd: 1_000_000_000 }),
    null,
  );
});
