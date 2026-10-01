import assert from "node:assert/strict";
import test from "node:test";
import { assets } from "../lib/assets.ts";
import { extractCriteria, parseSearchContext, searchCountries, searchAssetsByCriteria } from "../lib/search.ts";
import { prepareConsultationSearch } from "../lib/consultation-search.ts";
import { collectSearchCountries } from "../lib/multi-country-discovery.ts";
import { validateIntent } from "../lib/consultation-intent.ts";
import { conditionChips } from "../lib/consultation-view.ts";

const snapshot = { baseCurrency: "USD", rates: { USD: 1, KRW: 1400, PHP: 56, VND: 25000 },
  updatedAt: "2026-10-01T00:00:00Z", nextUpdateAt: null, provider: "ExchangeRate-API" };
const unit = (country, price, currency = "USD", bedrooms = 2) => ({ ...assets[0],
  id: `${country}-${price}`, country, city: country, price, currency, bedrooms, transaction: "rent", trustScore: 50 });

test("first unspecified search spans connected three; explicit geography remains hard", () => {
  const first = extractCriteria("2억원 이하 콘도 매매");
  assert.deepEqual(searchCountries(first), ["Cambodia", "Vietnam", "Philippines"]);
  assert.equal(first.city, null);
  assert.deepEqual(parseSearchContext(first), first);
  assert.deepEqual(searchCountries(extractCriteria("베트남 콘도")), ["Vietnam"]);
  assert.equal(extractCriteria("호치민 콘도").city, "Ho Chi Minh City");
  assert.equal(extractCriteria("캄보디아 콘도").city, "Phnom Penh");
});

test("explicit comparison uses all named countries and follow-up preserves scope", () => {
  const first = extractCriteria("캄보디아 베트남 필리핀 2베드 임대");
  assert.equal(searchCountries(first).length, 3);
  assert.equal(first.city, null);
  assert.deepEqual(searchCountries(extractCriteria("월 1000달러까지", first)), searchCountries(first));
  const next = extractCriteria("이번에는 필리핀", extractCriteria("호치민 2베드 임대"));
  assert.deepEqual(searchCountries(next), ["Philippines"]);
  assert.equal(next.city, null);
  assert.equal(next.district, null);
  assert.equal(next.bedrooms, 2);
  assert.equal(extractCriteria("침실은 상관없어", next).bedrooms, null);
  assert.equal(searchCountries(extractCriteria("처음부터 콘도 매매", next)).length, 3);
  assert.match(conditionChips(first)[0], /베트남/);
  assert.match(conditionChips(first)[0], /필리핀/);
});

test("rejects forged, duplicate or city-bearing multi-country contexts", () => {
  const c = extractCriteria("국가는 정하지 않았어 콘도");
  for (const bad of [{ countries: [] }, { countries: ["Moon"] }, { countries: ["Vietnam"] },
    { countries: ["Cambodia", "Cambodia"] }, { city: "Ho Chi Minh City" }, { district: "BKK1" }]) {
    assert.equal(parseSearchContext({ ...c, ...bad }), null);
  }
});

test("parallel country collection isolates failed country and reports empty success separately", async () => {
  const c = extractCriteria("콘도 매매");
  const started = [];
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const pending = collectSearchCountries(c, async country => {
    started.push(country);
    await gate;
    if (country === "Vietnam") throw new Error("test failure");
    return { assets: country === "Cambodia" ? [unit(country, 500)] : [], cached: false,
      checkedAt: snapshot.updatedAt, sources: [{ name: country, status: "collected", count: 0 }] };
  });
  assert.equal(started.length, 3);
  release();
  const result = await pending;
  assert.equal(result.assets.length, 1);
  assert.equal(result.coverage.find(x => x.country === "Vietnam").status, "unavailable");
  assert.equal(result.coverage.find(x => x.country === "Philippines").status, "collected");
});

test("PHP budget filters all countries using one observed FX snapshot, preserving source prices", async () => {
  const source = [unit("Philippines", 70000, "PHP"), unit("Philippines", 70001, "PHP"),
    unit("Vietnam", 30000000, "VND"), unit("Cambodia", 1200), unit("Cambodia", 1300)];
  const result = await prepareConsultationSearch("월 70,000페소 이하 2베드 콘도 임대", {
    provider: "disabled", exchangeRate: snapshot,
  }, async () => source);
  assert.equal(result.intent.criteria.maxPriceUsd, 1250);
  assert.equal(result.preparedSearch.matches.length, 3);
  assert.equal(result.preparedSearch.matches.find(x => x.currency === "PHP").price, 70000);
});

test("KRW budget uses observed rather than demo FX; native VND rules and unavailable FX are bounded", async () => {
  const r = await prepareConsultationSearch("2억원 이하 콘도 매매", {
    provider: "disabled", exchangeRate: snapshot,
  }, async () => []);
  assert.equal(r.intent.criteria.maxPriceUsd, 200000000 / 1400);
  assert.equal(extractCriteria("월 3000만 동 이하 임대").consultation.budget.amount, 30000000);
  let called = false;
  const failed = await prepareConsultationSearch("월 70000페소 이하 임대", {
    provider: "disabled", exchangeRate: null,
  }, async () => { called = true; return []; });
  assert.equal(called, false);
  assert.match(failed.intent.clarification, /환율/);
});

test("multi-country ranking returns at most five globally, never one-country quota", () => {
  const c = extractCriteria("월 1500달러 이하 콘도 임대");
  const result = searchAssetsByCriteria(c, Array.from({ length: 9 }, (_, n) => unit("Philippines", 500 + n)), { strict: true });
  assert.equal(result.matches.length, 5);
  assert.ok(result.matches.every(x => x.country === "Philippines"));
});

test("intent schema supports PHP without model FX and keeps server-owned country scope", () => {
  const boundary = extractCriteria("필리핀에서 월 70000페소 이하 2베드 임대");
  const plan = { transaction: "rent", purpose: "residence", propertyType: "condo", bedrooms: 2,
    wantsRiver: false, wantsShortStay: false, consultation: { ...boundary.consultation,
      budget: { amount: 70000, currency: "PHP", scope: "monthlyRent" } } };
  const valid = validateIntent(plan, boundary);
  assert.equal(valid.consultation.budget.currency, "PHP");
  assert.equal(valid.maxPriceUsd, null);
});
