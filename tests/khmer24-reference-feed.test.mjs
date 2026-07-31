import assert from "node:assert/strict";
import test from "node:test";

import {
  assertReferenceSearchAllowed,
  createKhmer24ReferenceConnector,
  KHMER24_REFERENCE_CONNECTOR_KIND,
  parseKhmer24ReferenceHtml,
} from "../ingestion/khmer24-reference-feed.ts";

const NOW = new Date("2026-07-31T09:00:00.000Z");
const CATEGORY_URL =
  "https://www.khmer24.com/km/c-property-housing-rentals";
const ROBOTS = `
User-agent: *
Content-Signal: search=yes,ai-train=no,use=reference
Allow: /

User-agent: *
Disallow: /search
Disallow: /me/
`;
const HTML = `<!doctype html>
<html><body><main><ul><li>
  <a href="/km/riverside-condo-adid-13812461" class="post bg-white">
    <div class="photo">
      <img src="https://images.khmer24.co/demo/riverside-condo.jpg" alt="Riverside condo for rent">
    </div>
    <div class="p-2">
      <p class="title truncate">Riverside condo for rent</p>
      <div class="date-location">
        <p><span>1h • </span><span>មានជ័យ, ភ្នំពេញ</span></p>
        <p><span>ជួល</span><span> • </span><span>បន្ទប់គេង 2 • </span><span>បន្ទប់ទឹក 1 • </span><span>67m²</span></p>
      </div>
      <strong class="text-red-500">$360</strong>
    </div>
  </a>
</li></ul></main></body></html>`;

test("parses supported Khmer24 reference cards without seller contact data", () => {
  const candidates = parseKhmer24ReferenceHtml(
    HTML,
    new URL(CATEGORY_URL),
    NOW,
    40,
  );

  assert.equal(candidates.length, 1);
  assert.deepEqual(candidates[0], {
    country: "Cambodia",
    city: "Phnom Penh",
    district: "Mean Chey",
    transaction: "rent",
    propertyType: "condo",
    price: 360,
    currency: "USD",
    areaSqm: 67,
    bedrooms: 2,
    bathrooms: 1,
    imageUrl: "https://images.khmer24.co/demo/riverside-condo.jpg",
    title: "Riverside condo for rent",
    summary:
      "Public marketplace reference in Mean Chey, Phnom Penh. condo, rent, 67 sqm.",
    sourceExternalKey: "13812461",
    sourceUrl:
      "https://www.khmer24.com/km/riverside-condo-adid-13812461",
    observedAt: NOW.toISOString(),
  });
});

test("requires reference-search content signals and honors disallowed paths", () => {
  assert.doesNotThrow(() =>
    assertReferenceSearchAllowed(
      ROBOTS,
      "/km/c-property-housing-rentals",
    ),
  );
  assert.throws(
    () => assertReferenceSearchAllowed("User-agent: *\nAllow: /", "/km/c-property-housing-rentals"),
    /does not allow reference search/,
  );
  assert.throws(
    () => assertReferenceSearchAllowed(ROBOTS, "/search"),
    /disallows the configured category/,
  );
});

test("collects approved reference HTML and stores exact provenance", async () => {
  const writes = [];
  const requests = [];
  const connector = createKhmer24ReferenceConnector({
    sourceSlug: "khmer24-cambodia",
    categoryUrl: CATEGORY_URL,
    allowedHosts: ["www.khmer24.com"],
    maxRecords: 40,
    rawStore: {
      async put(...args) {
        writes.push(args);
      },
    },
    now: () => NOW,
    fetchImpl: async (input) => {
      const url = String(input);
      requests.push(url);
      return url.endsWith("/robots.txt")
        ? new Response(ROBOTS, {
            status: 200,
            headers: { "content-type": "text/plain" },
          })
        : new Response(HTML, {
            status: 200,
            headers: { "content-type": "text/html; charset=utf-8" },
          });
    },
  });

  const batch = await connector.collect();
  assert.equal(connector.connectorKind, KHMER24_REFERENCE_CONNECTOR_KIND);
  assert.deepEqual(requests, [
    "https://www.khmer24.com/robots.txt",
    CATEGORY_URL,
  ]);
  assert.equal(batch.candidates.length, 1);
  assert.match(
    batch.snapshot.objectKey,
    /^raw\/khmer24-cambodia\/2026-07-31\/[a-f0-9]{64}\.html$/,
  );
  assert.equal(writes.length, 1);
  assert.equal(writes[0][2].customMetadata.collectionMode, "reference-search");
});

test("reports source-side bot refusal without bypassing it", async () => {
  const connector = createKhmer24ReferenceConnector({
    sourceSlug: "khmer24-cambodia",
    categoryUrl: CATEGORY_URL,
    allowedHosts: ["www.khmer24.com"],
    maxRecords: 40,
    rawStore: { async put() {} },
    fetchImpl: async (input) =>
      String(input).endsWith("/robots.txt")
        ? new Response(ROBOTS, { status: 200 })
        : new Response("Just a moment", { status: 403 }),
  });

  await assert.rejects(connector.collect(), /partner allowlisting/);
});
