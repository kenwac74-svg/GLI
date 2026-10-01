import assert from "node:assert/strict";
import test from "node:test";
import { discoverVietnamReferences, isVietnamDemoEnabled, isVietnamLocalRuntime, parseEraProjects, parseDotPropertyListings, findLiveVietnamAsset, assertVietnamRobotsAllowed } from "../lib/vietnam-discovery.ts";
import { searchAssetsByCriteria, extractCriteria } from "../lib/search.ts";

const observedAt = new Date("2026-09-30T08:00:00Z");
const project = {
  id: "project-1", slug: "the-habitat", projectName: "The Habitat", location: "Ho Chi Minh City",
  publicationStatus: "published", tags: ["condo", "sale"], investor: "Developer", area: "4.1 ha",
  publishedAt: "2026-08-18T04:12:07Z", updatedAt: "2026-08-19T04:12:07Z",
  createdBy: { name: "Private", email: "private@example.test" }, price: 123,
};
const html = (projects) => `<html><script>self.__next_f.push(${JSON.stringify([1,
  `8:${JSON.stringify(["$", "$L14", null, { initialProjects: projects }])}\n`,
])})</script></html>`;

test("ERA projects preserve provenance and dates, never imply priced individual units", () => {
  const [result] = parseEraProjects(html([project, project]), observedAt);
  assert.equal(result.title, "The Habitat");
  assert.equal(result.sourceUrl, "https://era.com.vn/du-an/the-habitat/");
  assert.equal(result.projectAreaText, "4.1 ha");
  assert.equal(result.unitPrice, null);
  assert.equal(result.monthlyRent, null);
  assert.equal(result.netMonthlyIncome, null);
  assert.notEqual(result.publishedAt, result.observedAt);
  assert.equal(parseEraProjects(html([project, project]), observedAt).length, 1);
  assert.ok(!JSON.stringify(result).includes("private@example.test"));
});

test("ERA rejects drafts, unsafe links and email fields; source scripts are not evaluated", () => {
  assert.equal(parseEraProjects(html([{ ...project, publicationStatus: "draft" }, { ...project, slug: "../private" }]), observedAt).length, 0);
  const [result] = parseEraProjects(html([{ ...project, investor: "private@example.test", publishedAt: "not-a-date" }]), observedAt);
  assert.equal(result.developerClaim, null);
  assert.equal(result.publishedAt, null);
  assert.deepEqual(parseEraProjects("<script>throw new Error('do not execute')</script>", observedAt), []);
});

test("demo-only gate never authorises a commercial deployment", async () => {
  assert.equal(isVietnamDemoEnabled({ NODE_ENV: "development" }), true);
  assert.equal(isVietnamDemoEnabled({ NODE_ENV: "development", DEPLOYMENT_STAGE: "development" }), true);
  assert.equal(isVietnamDemoEnabled({ NODE_ENV: "production", DEPLOYMENT_STAGE: "development" }), false);
  assert.equal(isVietnamDemoEnabled({ NODE_ENV: "production" }), false);
  assert.equal(isVietnamDemoEnabled({ NODE_ENV: "development", DEPLOYMENT_STAGE: "production", DEMO_SOURCE_AUTO_APPROVAL: "true" }), false);
  assert.equal(isVietnamDemoEnabled({ DEPLOYMENT_STAGE: "demo", DEMO_SOURCE_AUTO_APPROVAL: "true" }), true);
  const result = await discoverVietnamReferences({ fetchImpl: () => { throw new Error("must not fetch"); } });
  assert.ok(result.sources.every(source => source.status === "disabled"));
});

test("P45 admits Dot demo listings but never requests deferred or blocked sources", async () => {
  const requests = [];
  const fetchImpl = async (url) => {
    requests.push(String(url));
    return new Response("User-agent: *\nDisallow: /", { headers: { "content-type": "text/plain" } });
  };
  const result = await discoverVietnamReferences({ enabled: true, fetchImpl, now: () => observedAt });
  assert.deepEqual(result.projects, []);
  assert.equal(result.sources.find(source => source.name === "ERA Vietnam").reason, "auxiliary_deferred_P44");
  assert.equal(result.sources.find(source => source.name === "Batdongsan.com.vn").reason, "access_blocked_HTTP_403");
  assert.equal(result.sources.find(source => source.name === "Dot Property Vietnam").status, "blocked");
  assert.equal(result.sources.find(source => source.name === "Homedy").status, "disabled");
  assert.deepEqual(requests, ["https://www.dotproperty.com.vn/robots.txt"]);
});

test("local worker bindings require both development stage and a loopback URL", () => {
  assert.equal(isVietnamLocalRuntime("http://localhost:8776/api/discovery/vietnam", "development"), true);
  assert.equal(isVietnamLocalRuntime("https://glibiz.net/api/discovery/vietnam", "development"), false);
  assert.equal(isVietnamLocalRuntime("http://localhost:8776/api/discovery/vietnam", "production"), false);
  assert.equal(isVietnamLocalRuntime("http://localhost:8776/api/discovery/vietnam", undefined), false);
  assert.equal(isVietnamLocalRuntime("invalid", "development"), false);
});

test("failed collection does not become collected and Homedy mapping remains held", async () => {
  const result = await discoverVietnamReferences({ enabled: true, now: () => observedAt, fetchImpl: async () => { throw new Error("must not fetch"); } });
  assert.deepEqual(result.projects, []);
  const candidates = result.sources.filter(source => ["Dot Property Vietnam", "Homedy"].includes(source.name));
  assert.equal(candidates.length, 2);
  assert.equal(candidates.find(source => source.name === "Dot Property Vietnam").status, "unavailable");
  assert.equal(candidates.find(source => source.name === "Homedy").reason, "listing_mapping_timeout");
});

test("runtime shares a collection and caches source records for details", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async url => { requests.push(String(url)); return mockResponse(String(url)); };
  try {
    const first = await discoverVietnamReferences({ enabled: true });
    const second = await discoverVietnamReferences({ enabled: true });
    assert.equal(second.cached, true);
    for (const result of [first, second]) {
      assert.deepEqual(result.projects, []);
      assert.equal(result.assets.length, 2);
      assert.equal(result.sources.some(source => source.name === "IQI Vietnam"), false);
    }
    assert.equal(requests.length, 4);
    const refreshed = await discoverVietnamReferences({ enabled: true, refresh: true });
    assert.equal(refreshed.cached, false);
    assert.ok(requests.length > 4);
    assert.equal(findLiveVietnamAsset(first.assets[0].id).sourceUrl, first.assets[0].sourceUrl);
  } finally { globalThis.fetch = originalFetch; }
});

function listing(transaction = "sale", price = "₫ 2.5 billion", key = "unit-1", title = `2 Bedroom Condo for ${transaction} in Example, Ho Chi Minh`) {
  return `<article class="listing-snippet" data-uuid="${key}"><a href="https://www.dotproperty.com.vn/en/ads/${key}"><div class="sm:truncate" title="${title}"></div></a><div class="my-[5px]">District 2, Ho Chi Minh</div><div class="text-3xl text-secondary-base">${price}</div><ul><li><img src="//build.dotproperty.com.vn/assets/bed-test.svg">2</li><li><img src="//build.dotproperty.com.vn/assets/bathtub-test.svg">1</li><li><img src="//build.dotproperty.com.vn/assets/resize-test.svg">69 m<sup>2</sup></li></ul><img src="https://pix.dotproperty.co.th/property.jpg"></article>`;
}
function mockResponse(url) {
  if (url.includes("robots.txt")) return new Response("User-agent: *\nAllow: /", { headers: { "content-type": "text/plain" } });
  if (url.includes("open.er-api.com")) return Response.json({ result: "success", rates: { USD: 1, VND: 25000, KRW: 1400 }, time_last_update_unix: 1790726400 });
  return new Response(url.endsWith("rent") ? listing("rent", "₫ 25 million / month", "rent-1") : listing(), { headers: { "content-type": "text/html" } });
}

test("listing mapping preserves VND, transaction, fields and an unknown publication date", () => {
  const [asset] = parseDotPropertyListings(listing() + listing(), "sale", observedAt);
  assert.equal(asset.price, 2500000000);
  assert.equal(asset.currency, "VND");
  assert.equal(asset.city, "Ho Chi Minh City");
  assert.equal(asset.areaSqm, 69);
  assert.equal(asset.bathrooms, 1);
  assert.equal(asset.updatedAt, "");
  assert.equal(asset.sourceObservedAt, observedAt.toISOString());
  assert.equal(asset.trustStatus, "PRELIMINARY");
  assert.equal(parseDotPropertyListings(listing() + listing(), "sale", observedAt).length, 1);
  assert.equal(parseDotPropertyListings(listing(), "rent", observedAt).length, 0);
});

test("rejects unsafe source URLs, incomplete fields, contacts and unsupported currency", () => {
  for (const html of [listing().replace("www.dotproperty.com.vn/en/ads", "evil.test/en/ads"), listing().replace("bathtub-test", "unknown-test"), listing("sale", "$ 100,000"), listing("sale", "₫ 2.5 billion", "unit-1", "2 Bedroom Condo for sale call 0901234567")]) {
    assert.deepEqual(parseDotPropertyListings(html, "sale", observedAt), []);
  }
  assert.equal(parseDotPropertyListings(Array.from({ length: 35 }, (_, i) => listing("sale", "₫ 1 billion", `unit-${i}`)).join(""), "sale", observedAt).length, 20);
});

test("only converted prices can satisfy USD budgets; no invented FX fallback", async () => {
  const result = await discoverVietnamReferences({ enabled: true, now: () => observedAt, fetchImpl: async url => mockResponse(String(url)) });
  const asset = result.assets.find(asset => asset.transaction === "sale");
  assert.equal(asset.priceUsdReference.amount, 100000);
  const criteria = { ...extractCriteria("베트남 호치민 콘도 매매"), maxPriceUsd: 110000 };
  assert.equal(searchAssetsByCriteria(criteria, [asset], { strict: true }).matches.length, 1);
  assert.equal(searchAssetsByCriteria({ ...criteria, maxPriceUsd: 90000 }, [asset], { strict: true }).matches.length, 0);
  const unknown = { ...asset, priceUsdReference: undefined };
  assert.equal(searchAssetsByCriteria(criteria, [unknown], { strict: true }).matches.length, 0);
  assert.equal(searchAssetsByCriteria({ ...criteria, maxPriceUsd: null }, [unknown], { strict: true }).matches.length, 1);
});

test("redirect refusal and oversize responses stop without follow-up downloads", async () => {
  let requests = 0;
  const redirect = await discoverVietnamReferences({ enabled: true, now: () => observedAt, fetchImpl: async () => { requests++; return new Response(null, { status: 302 }); } });
  assert.equal(requests, 1);
  assert.equal(redirect.assets.length, 0);
  const oversized = await discoverVietnamReferences({ enabled: true, now: () => observedAt, fetchImpl: async url => String(url).endsWith("robots.txt") ? mockResponse(String(url)) : new Response("", { headers: { "content-length": "2000001", "content-type": "text/html" } }) });
  assert.equal(oversized.assets.length, 0);
  assert.equal(oversized.sources.find(source => source.name === "Dot Property Vietnam").reason, "response_too_large");
});

test("robots respects GLI-specific groups and wildcard path rules", () => {
  assert.doesNotThrow(() => assertVietnamRobotsAllowed("User-agent: OtherBot\nDisallow: /", "/en/condos-for-sale"));
  assert.throws(() => assertVietnamRobotsAllowed("User-agent: *\nAllow: /\nUser-agent: GLI-Reference-Search\nDisallow: /en/*", "/en/condos-for-sale"), /robots policy/);
  assert.doesNotThrow(() => assertVietnamRobotsAllowed("User-agent: GPTBot\nDisallow: /\nUser-agent: *\nAllow: /\nDisallow: /en/*\nAllow: /en/condos-for-sale", "/en/condos-for-sale"));
});
