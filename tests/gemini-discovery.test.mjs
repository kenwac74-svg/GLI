import assert from "node:assert/strict";
import test from "node:test";

import { discoverWithGemini } from "../lib/gemini-discovery.ts";

const NOW = new Date("2026-08-13T03:00:00.000Z");
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

test("does not call Gemini outside the currently connected Cambodia scope", async () => {
  let called = false;
  const result = await discoverWithGemini("세부 콘도", {
    ...criteria,
    country: "Philippines",
    city: "Cebu",
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
