import assert from "node:assert/strict";
import test from "node:test";

import { extractCriteria, searchAssets } from "../lib/search.ts";

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
