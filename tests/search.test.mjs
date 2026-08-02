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

const vietnamAsset = {
  ...assets[0],
  id: "GLI-VN-HCMC",
  country: "Vietnam",
  countryCode: "VN",
  city: "Ho Chi Minh City",
  district: "Thu Thiem",
  title: "Thu Thiem residence",
};

const sihanoukvilleAsset = {
  ...assets[0],
  id: "GLI-KH-SIHANOUKVILLE",
  city: "Sihanoukville",
  district: "Koh Rong",
  propertyType: "villa",
  bedrooms: 3,
  bathrooms: 4,
  price: 5000,
  title: "Pagoda Beach villa",
};

test("treats the requested country as a hard recommendation boundary", () => {
  const result = searchAssets("베트남에서 3베드 빌라를 찾아줘", [...assets, vietnamAsset]);

  assert.equal(result.criteria.country, "Vietnam");
  assert.ok(result.matches.every((asset) => asset.country === "Vietnam"));
  assert.match(result.answer, /베트남/);
  assert.doesNotMatch(result.answer, /프놈펜/);
  assert.doesNotMatch(result.answer, /캄보디아 자산을 추천/);
});

test("asks before expanding to another country when the requested country has no result", () => {
  const result = searchAssets("베트남에서 매물을 찾아줘", assets);

  assert.equal(result.criteria.country, "Vietnam");
  assert.deepEqual(result.matches, []);
  assert.match(result.answer, /베트남/);
  assert.match(result.answer, /국가 조건을 임의로 변경/);
  assert.match(result.clarification, /다른 도시나 국가까지 범위를 넓혀 검토할까요/);
});

test("extracts a Phnom Penh district from conversational Korean", () => {
  const criteria = extractCriteria(
    "프놈펜 톤레바삭에서 월 700달러 이하 1베드 임대 매물을 찾아줘",
  );
  assert.equal(criteria.district, "Tonle Bassac");
  assert.equal(criteria.transaction, "rent");
  assert.equal(criteria.maxPriceUsd, 700);
  assert.equal(criteria.bedrooms, 1);
});

test("recognizes Cambodia cities and never substitutes Phnom Penh", () => {
  const criteria = extractCriteria(
    "캄보디아 시하누크빌에서 월 5000달러 이하 주거용 임대 매물을 찾아줘",
  );
  const result = searchAssets(
    "캄보디아 시하누크빌에서 월 5000달러 이하 주거용 임대 매물을 찾아줘",
    [...assets, sihanoukvilleAsset],
  );

  assert.equal(criteria.city, "Sihanoukville");
  assert.deepEqual(result.matches.map((asset) => asset.id), ["GLI-KH-SIHANOUKVILLE"]);
  assert.ok(result.matches.every((asset) => asset.city === "Sihanoukville"));
});

test("infers a country from an explicitly named city", () => {
  assert.deepEqual(
    [extractCriteria("다낭에서 콘도를 찾아줘").country, extractCriteria("세부에서 콘도를 찾아줘").country],
    ["Vietnam", "Philippines"],
  );
});

test("does not broaden a city-specific search when that city has no result", () => {
  const result = searchAssets("시엠립에서 월 700달러 이하 임대", assets);

  assert.deepEqual(result.matches, []);
  assert.match(result.answer, /Siem Reap/);
  assert.match(result.clarification, /다른 도시나 국가/);
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

test("does not silently replace an unavailable country-specific request", () => {
  const initial = extractCriteria(
    "겨울마다 3개월 머물고 없을 때는 에어비앤비로 운영할 별장을 찾아줘",
  );
  const result = searchAssets("예산은 1억원이고 2베드가 좋아", assets, initial);

  assert.deepEqual(result.matches, []);
  assert.match(result.answer, /캄보디아/);
  assert.match(result.answer, /국가 조건을 임의로 변경/);
  assert.match(result.clarification, /다른 도시나 국가까지 범위를 넓혀 검토할까요/);
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
