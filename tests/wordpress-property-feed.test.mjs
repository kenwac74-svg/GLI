import assert from "node:assert/strict";
import test from "node:test";

import {
  assertRobotsPathAllowed,
  createWordPressPropertyConnector,
  toWordPressNormalizationInput,
  WORDPRESS_PROPERTY_CONNECTOR_KIND,
} from "../ingestion/wordpress-property-feed.ts";

const NOW = new Date("2026-07-31T11:00:00.000Z");
const API_URL =
  "https://property.example/wp-json/wp/v2/property?per_page=20&_embed=wp:featuredmedia";
const ROBOTS = "User-agent: *\nDisallow: /private/\nAllow: /wp-json/\n";

function property(overrides = {}) {
  return {
    id: 4101,
    modified_gmt: "2026-07-31T10:00:00",
    link: "https://property.example/en/property/phnom-penh-condo-for-rent/",
    title: { rendered: "Riverside &amp; City Condo for Rent" },
    property_meta: {
      REAL_HOMES_property_price: "650",
      REAL_HOMES_property_size: "72",
      REAL_HOMES_property_bedrooms: "2",
      REAL_HOMES_property_bathrooms: "2",
      REAL_HOMES_property_address: "Tonle Bassac, Khan Chamkarmon, Phnom Penh",
      REAL_HOMES_property_type: "Apartment",
      REAL_HOMES_property_price_postfix: "per month",
    },
    _embedded: {
      "wp:featuredmedia": [
        { source_url: "https://property.example/media/4101.jpg" },
      ],
    },
    ...overrides,
  };
}

test("normalizes complete WordPress property records without copying descriptions", () => {
  const value = toWordPressNormalizationInput(
    property(),
    ["property.example"],
    NOW,
    "/en/",
  );

  assert.deepEqual(value, {
    country: "Cambodia",
    city: "Phnom Penh",
    district: "Chamkarmon",
    transaction: "rent",
    propertyType: "condo",
    price: 650,
    currency: "USD",
    areaSqm: 72,
    bedrooms: 2,
    bathrooms: 2,
    imageUrl: "https://property.example/media/4101.jpg",
    title: "Riverside & City Condo for Rent",
    summary:
      "Public property reference in Chamkarmon, Phnom Penh. condo, rent, 72 sqm.",
    sourceExternalKey: "4101",
    sourceUrl:
      "https://property.example/en/property/phnom-penh-condo-for-rent/",
    observedAt: NOW.toISOString(),
  });
});

test("rejects ambiguous values, unsupported records, and non-English links", () => {
  assert.equal(
    toWordPressNormalizationInput(
      property({
        property_meta: {
          ...property().property_meta,
          REAL_HOMES_property_price: "500 - 750",
        },
      }),
      ["property.example"],
      NOW,
      "/en/",
    ),
    null,
  );
  assert.equal(
    toWordPressNormalizationInput(
      property({ link: "https://property.example/kh/property/demo/" }),
      ["property.example"],
      NOW,
      "/en/",
    ),
    null,
  );
});

test("honors robots policy for the configured WordPress API path", () => {
  assert.doesNotThrow(() =>
    assertRobotsPathAllowed(ROBOTS, "/wp-json/wp/v2/property"),
  );
  assert.throws(
    () =>
      assertRobotsPathAllowed(
        "User-agent: *\nDisallow: /wp-json/\n",
        "/wp-json/wp/v2/property",
      ),
    /disallows the configured API path/,
  );
});

test("collects a bounded API response and stores exact raw provenance", async () => {
  const writes = [];
  const requests = [];
  const connector = createWordPressPropertyConnector({
    sourceSlug: "property-example",
    apiUrl: API_URL,
    allowedHosts: ["property.example"],
    maxRecords: 20,
    requiredLinkPathPrefix: "/en/",
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
        : new Response(JSON.stringify([property()]), {
            status: 200,
            headers: { "content-type": "application/json; charset=utf-8" },
          });
    },
  });

  const batch = await connector.collect();
  assert.equal(connector.connectorKind, WORDPRESS_PROPERTY_CONNECTOR_KIND);
  assert.deepEqual(requests, ["https://property.example/robots.txt", API_URL]);
  assert.equal(batch.candidates.length, 1);
  assert.match(
    batch.snapshot.objectKey,
    /^raw\/property-example\/2026-07-31\/[a-f0-9]{64}\.json$/,
  );
  assert.equal(writes.length, 1);
  assert.equal(
    writes[0][2].customMetadata.collectionMode,
    "wordpress-reference-api",
  );
});

