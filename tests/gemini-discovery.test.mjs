import assert from "node:assert/strict";
import test from "node:test";

import { discoverWithGemini } from "../lib/gemini-discovery.ts";

const NOW = new Date("2026-08-13T03:00:00.000Z");

test("concurrent identical discovery coalesces, failures cool down, accounts remain isolated", async () => {
  let calls = 0;
  const options = { apiKey: "coalesce-test", now: () => NOW, scope: "member-a", fetchImpl: async () => {
    calls++;
    await new Promise(resolve => setTimeout(resolve, 10));
    return new Response("unavailable", { status: 503 });
  } };
  const results = await Promise.all(Array.from({ length: 3 }, () => discoverWithGemini("same coalesce query", criteria, options)));
  assert.equal(calls, 1);
  assert.ok(results.every(result => result.status === "error"));
  assert.equal((await discoverWithGemini("same coalesce query", criteria, options)).cached, true);
  assert.equal(calls, 1);
  await discoverWithGemini("same coalesce query", criteria, { ...options, scope: "member-b" });
  assert.equal(calls, 2);
  await discoverWithGemini("same coalesce query", criteria, { ...options, now: () => new Date(NOW.getTime() + 61000) });
  assert.equal(calls, 3);
});

test("pre-canceled discovery never calls upstream", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(discoverWithGemini("cancel-test", criteria, { apiKey: "test", signal: controller.signal,
    fetchImpl: async () => { assert.fail("must not dispatch"); },
  }));
});
const criteria = {
  country: "Cambodia",
  city: "Sihanoukville",
  district: null,
  transaction: "sale",
  propertyType: "condo",
  maxPriceUsd: 80_000,
  budgetKrw: 100_000_000,
  bedrooms: null,
  purpose: "income",
  wantsShortStay: false,
  wantsRiver: false,
};

function geminiResponse(listings) {
  return new Response(
    JSON.stringify({
      candidates: [
        {
          content: { parts: [{ text: JSON.stringify({ listings }) }] },
          groundingMetadata: {
            webSearchQueries: ["site:khmer24.com Sihanoukville condo sale"],
          },
        },
      ],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function listing(overrides = {}) {
  return {
    sourceUrl: "https://www.khmer24.com/en/sihanoukville-condo-adid-1234",
    sourceName: "Khmer24",
    title: "Sihanoukville studio condo for sale",
    country: "Cambodia",
    city: "Sihanoukville",
    district: "Mittapheap",
    transaction: "sale",
    propertyType: "condo",
    price: 65_000,
    currency: "USD",
    areaSqm: 34,
    bedrooms: 0,
    bathrooms: 1,
    summary: "Published studio condominium listing near central Sihanoukville.",
    imageUrl: "https://www.khmer24.com/images/demo.jpg",
    publishedAt: "2026-08-12T07:00:00+07:00",
    ...overrides,
  };
}

test("returns only server-validated listings from approved Cambodia sources", async () => {
  let requestBody;
  const result = await discoverWithGemini("시아누크빌 1억원 콘도 매매", criteria, {
    apiKey: "test-key",
    now: () => NOW,
    cacheTtlMs: 1,
    fetchImpl: async (_input, init) => {
      requestBody = JSON.parse(String(init?.body));
      return geminiResponse([
        listing(),
        listing({
          sourceUrl: "https://example.com/invented-listing",
          title: "Unapproved source",
        }),
        listing({ city: "Phnom Penh", title: "Wrong city" }),
        listing({ price: 120_000, title: "Over budget" }),
      ]);
    },
  });

  assert.equal(result.status, "collected");
  assert.equal(result.assets.length, 1);
  assert.equal(result.assets[0].city, "Sihanoukville");
  assert.equal(result.assets[0].sourceName, "Khmer24");
  assert.equal(result.assets[0].trustStatus, "PRELIMINARY");
  assert.equal(result.groundedQueryCount, 1);
  assert.deepEqual(requestBody.tools, [{ google_search: {} }]);
  assert.equal(
    requestBody.generationConfig.thinkingConfig.thinkingLevel,
    "medium",
  );
});

test("does not call Gemini outside registered countries", async () => {
  let called = false;
  const result = await discoverWithGemini("세부 콘도", {
    ...criteria,
    country: "Malaysia",
    city: "Kuala Lumpur",
  }, {
    apiKey: "test-key",
    now: () => NOW,
    fetchImpl: async () => {
      called = true;
      return geminiResponse([]);
    },
  });

  assert.equal(called, false);
  assert.equal(result.status, "disabled");
  assert.deepEqual(result.assets, []);
});

test("fresh multi-country scout includes VN/PH and rejects country-source mismatches", async () => {
  let calls = 0;
  const scope = { ...criteria, countries: ["Cambodia", "Vietnam", "Philippines"], city: null, maxPriceUsd: null };
  const options = { apiKey: "fresh-test", now: () => NOW, refresh: true, fetchImpl: async (_url, init) => {
    calls++;
    const body = JSON.parse(init.body);
    const task = JSON.parse(body.contents[0].parts[0].text);
    assert.ok(task.allowedDomains.includes("dotproperty.com.vn"));
    assert.ok(task.allowedDomains.includes("dotproperty.com.ph"));
    return geminiResponse([
      listing({ country: "Vietnam", city: "Ho Chi Minh", currency: "VND", price: 2000000000, publishedAt: "", sourceUrl: "https://www.dotproperty.com.vn/en/ads/test-vn" }),
      listing({ country: "Philippines", city: "Cebu", currency: "PHP", price: 4000000, sourceUrl: "https://www.dotproperty.com.ph/ads/test-ph" }),
      listing({ country: "Vietnam", sourceUrl: "https://www.dotproperty.com.ph/ads/wrong-country" }),
      listing({ country: "Vietnam", sourceUrl: "https://www.dotproperty.com.vn/en/condos-for-sale" }),
    ]);
  } };
  const first = await discoverWithGemini("fresh countries", scope, options);
  const second = await discoverWithGemini("fresh countries", scope, options);
  assert.equal(calls, 2);
  assert.equal(second.cached, false);
  assert.deepEqual(first.assets.map(asset => asset.countryCode), ["VN", "PH"]);
  assert.equal(first.assets[0].updatedAt, "");
  assert.ok(first.assets.every(asset => asset.sourceObservedAt === NOW.toISOString()));
});

test("fails closed without exposing provider errors or unstructured text", async () => {
  const result = await discoverWithGemini("시아누크빌 콘도", criteria, {
    apiKey: "test-key",
    now: () => NOW,
    cacheTtlMs: 1,
    fetchImpl: async () =>
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "not-json" }] } }] }), {
        status: 200,
      }),
  });

  assert.equal(result.status, "empty");
  assert.deepEqual(result.assets, []);
});
