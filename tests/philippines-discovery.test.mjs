import assert from "node:assert/strict";
import test from "node:test";
import { discoverPhilippinesAssets, findLivePhilippinesAsset } from "../lib/philippines-discovery.ts";
import { parseDotPropertyListings, isVietnamDemoEnabled } from "../lib/vietnam-discovery.ts";
import { candidateConverted } from "../lib/consultation-view.ts";
import { candidateLocation } from "../lib/location-display.ts";

const now = new Date("2026-10-01T04:00:00Z");
function card(price = "₱ 23,000", key = "unit-1", title = "2 Bedroom Condo for Sale or Rent in Bloom Residences") {
  return `<article class="listing-snippet"><a href="https://www.dotproperty.com.ph/ads/${key}"><div class="sm:truncate" title="${title}"></div></a><div class="my-[5px]">Parañaque, Metro Manila</div><div class="text-3xl text-secondary-base">${price}</div><ul><li><img src="/assets/bed-test.svg">2</li><li><img src="/assets/bathtub-test.svg">1</li><li><img src="/assets/resize-test.svg">32.51 m<sup>2</sup></li></ul><img src="https://pix.dotproperty.co.th/property.jpg"></article>`;
}
function response(url) {
  if (url.endsWith("robots.txt")) return new Response("User-agent: *\nDisallow: /dashboard/*", { headers: { "content-type": "text/plain" } });
  if (url.includes("open.er-api.com")) return Response.json({ result: "success", rates: { USD: 1, PHP: 50, KRW: 1400 }, time_last_update_unix: 1790827200 });
  return new Response(card(url.endsWith("sale") ? "₱ 3,000,000" : "₱ 23,000"), { headers: { "content-type": "text/html" } });
}
test("PH mapping preserves PHP and keeps dual-purpose sale/rent records separate", () => {
  const [sale] = parseDotPropertyListings(card("₱ 3,000,000") + card("₱ 3,000,000"), "sale", now, "Philippines");
  const [rent] = parseDotPropertyListings(card(), "rent", now, "Philippines");
  assert.equal(sale.price, 3000000);
  assert.equal(rent.price, 23000);
  assert.equal(rent.currency, "PHP");
  assert.equal(rent.countryCode, "PH");
  assert.equal(rent.city, "Parañaque");
  assert.equal(rent.district, "Metro Manila");
  assert.equal(rent.areaSqm, 32.51);
  assert.equal(rent.updatedAt, "");
  assert.equal(rent.sourceObservedAt, now.toISOString());
  assert.equal(rent.trustStatus, "PRELIMINARY");
  assert.equal(rent.trustScore, 0);
  assert.notEqual(sale.id, rent.id);
  assert.equal(sale.sourceUrl, rent.sourceUrl);
  assert.equal(parseDotPropertyListings(card()+card(), "rent", now, "Philippines").length, 1);
});
test("PH rejects foreign hosts/currencies, incomplete metrics and wrong transaction", () => {
  for (const html of [card().replace("www.dotproperty.com.ph/ads", "evil.test/ads"), card("$ 23,000"), card().replace("bathtub-test", "unknown-test"), card("₱ 23000", "unit-1", "2 Bedroom Condo for sale in Makati")]) {
    assert.deepEqual(parseDotPropertyListings(html, "rent", now, "Philippines"), []);
  }
  assert.equal(parseDotPropertyListings(Array.from({ length: 35 }, (_, i) => card("₱ 23000", `unit-${i}`)).join(""), "rent", now, "Philippines").length, 20);
});
test("PH collector is demo only and never probes held sources", async () => {
  assert.equal(isVietnamDemoEnabled({ DEPLOYMENT_STAGE: "production", DEMO_SOURCE_AUTO_APPROVAL: "true" }), false);
  const disabled = await discoverPhilippinesAssets({ fetchImpl: () => { throw new Error("no request"); } });
  assert.equal(disabled.assets.length, 0);
  const requests = [];
  const result = await discoverPhilippinesAssets({ enabled: true, now: () => now, fetchImpl: async url => { requests.push(String(url)); return response(String(url)); } });
  assert.equal(result.assets.length, 2);
  assert.equal(result.assets[0].priceUsdReference.amount, 60000);
  assert.deepEqual(result.sources.slice(1).map(source => source.status), ["disabled", "disabled"]);
  assert.ok(requests.every(url => url.startsWith("https://www.dotproperty.com.ph/") || url.includes("open.er-api.com")));
});
test("PH respects robots and stops on refusal, redirects and oversize responses", async () => {
  for (const forbidden of [new Response("User-agent: *\nDisallow: /", { headers: { "content-type": "text/plain" } }), new Response(null, { status: 403 }), new Response(null, { status: 302 })]) {
    let requests = 0;
    const result = await discoverPhilippinesAssets({ enabled: true, now: () => now, fetchImpl: async () => { requests++; return forbidden; } });
    assert.equal(requests, 1);
    assert.equal(result.assets.length, 0);
  }
  const large = await discoverPhilippinesAssets({ enabled: true, now: () => now, fetchImpl: async url => String(url).endsWith("robots.txt") ? response(String(url)) : new Response("", { headers: { "content-type": "text/html", "content-length": "3000001" } }) });
  assert.equal(large.assets.length, 0);
  assert.equal(large.sources[0].reason, "response_too_large");
});
test("PH detail cache shares in-flight work and PHP uses existing Korean/FX projection", async () => {
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async url => { requests++; return response(String(url)); };
  try {
    const [first, shared] = await Promise.all([discoverPhilippinesAssets({ enabled: true }), discoverPhilippinesAssets({ enabled: true })]);
    assert.equal(first.assets[0].id, shared.assets[0].id);
    assert.equal((await discoverPhilippinesAssets({ enabled: true })).cached, true);
    assert.equal(requests, 4);
    const rent = first.assets.find(asset => asset.transaction === "rent");
    assert.equal(findLivePhilippinesAsset(rent.id).price, 23000);
    assert.ok(candidateLocation(rent).includes("필리핀"));
    assert.ok(candidateConverted(rent, { krwPerUsd: 1400, asOf: now.toISOString(), rates: { USD: 1, PHP: 50, KRW: 1400 } }).includes("644,000"));
  } finally { globalThis.fetch = originalFetch; }
});
