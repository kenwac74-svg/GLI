import assert from "node:assert/strict";
import test from "node:test";

import {
  createLicensedJsonFeedConnector,
  createUploadedLicensedJsonFeedConnector,
  LICENSED_JSON_CONNECTOR_KIND,
} from "../ingestion/licensed-json-feed.ts";

const NOW = new Date("2026-07-31T02:00:00.000Z");

function envelope(overrides = {}) {
  return {
    schemaVersion: "gli.partner-listings.v1",
    sourceSlug: "licensed-partner",
    generatedAt: NOW.toISOString(),
    listings: [
      {
        externalId: "partner-101",
        country: "Cambodia",
        city: "Phnom Penh",
        district: "BKK1",
        transaction: "rent",
        propertyType: "condo",
        price: 650,
        currency: "USD",
        areaSqm: 55,
        bedrooms: 1,
        bathrooms: 1,
        imageUrl: "https://feeds.partner.example/images/partner-101.jpg",
        title: "Licensed partner BKK1 residence",
        summary:
          "A structured partner-feed listing prepared for GLI review and verification.",
        sourceUrl: "https://feeds.partner.example/listings/partner-101",
        observedAt: NOW.toISOString(),
      },
    ],
    ...overrides,
  };
}

function connector(overrides = {}) {
  const writes = [];
  const responseBody = JSON.stringify(envelope());
  const value = createLicensedJsonFeedConnector({
    sourceSlug: "licensed-partner",
    feedUrl: "https://feeds.partner.example/v1/listings",
    allowedHosts: ["feeds.partner.example"],
    maxRecords: 100,
    now: () => NOW,
    rawStore: {
      async put(...args) {
        writes.push(args);
      },
    },
    fetchImpl: async () =>
      new Response(responseBody, {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8" },
      }),
    ...overrides,
  });
  return { value, writes };
}

test("collects a versioned licensed feed and writes one immutable raw object", async () => {
  const { value, writes } = connector();
  const batch = await value.collect();

  assert.equal(value.connectorKind, LICENSED_JSON_CONNECTOR_KIND);
  assert.equal(value.endpoint, "https://feeds.partner.example/v1/listings");
  assert.equal(batch.candidates.length, 1);
  assert.equal(batch.candidates[0].sourceExternalKey, "partner-101");
  assert.match(batch.snapshot.contentHash, /^[a-f0-9]{64}$/);
  assert.match(batch.snapshot.sourceUrlHash, /^[a-f0-9]{64}$/);
  assert.match(
    batch.snapshot.objectKey,
    /^raw\/licensed-partner\/2026-07-31\/[a-f0-9]{64}\.json$/,
  );
  assert.equal(writes.length, 1);
  assert.equal(writes[0][0], batch.snapshot.objectKey);
  assert.equal(writes[0][2].customMetadata.contentHash, batch.snapshot.contentHash);
});

test("blocks unapproved hosts before making a network request", () => {
  let fetched = false;
  assert.throws(
    () =>
      createLicensedJsonFeedConnector({
        sourceSlug: "licensed-partner",
        feedUrl: "https://unapproved.example/listings",
        allowedHosts: ["feeds.partner.example"],
        maxRecords: 100,
        rawStore: { async put() {} },
        fetchImpl: async () => {
          fetched = true;
          return new Response();
        },
      }),
    /approved allowlist/,
  );
  assert.equal(fetched, false);
});

test("rejects non-JSON responses and record-count overflow without storing raw data", async () => {
  const writes = [];
  const nonJson = connector({
    rawStore: {
      async put(...args) {
        writes.push(args);
      },
    },
    fetchImpl: async () =>
      new Response("<html></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
  }).value;
  await assert.rejects(nonJson.collect(), /must return application\/json/);
  assert.equal(writes.length, 0);

  const overflow = connector({
    maxRecords: 1,
    fetchImpl: async () =>
      new Response(
        JSON.stringify(
          envelope({ listings: [...envelope().listings, ...envelope().listings] }),
        ),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
  }).value;
  await assert.rejects(overflow.collect(), /approved record limit/);
});

test("collects an uploaded licensed feed through the same immutable boundary", async () => {
  const writes = [];
  const bytes = new TextEncoder().encode(JSON.stringify(envelope()));
  const uploaded = createUploadedLicensedJsonFeedConnector({
    sourceSlug: "licensed-partner",
    feedUrl: "https://feeds.partner.example/v1/listings",
    allowedHosts: ["feeds.partner.example"],
    maxRecords: 100,
    rawStore: {
      async put(...args) {
        writes.push(args);
      },
    },
    bytes,
    now: () => NOW,
  });

  const batch = await uploaded.collect();
  assert.equal(uploaded.connectorKind, LICENSED_JSON_CONNECTOR_KIND);
  assert.equal(batch.candidates[0].sourceExternalKey, "partner-101");
  assert.equal(batch.snapshot.httpStatus, 200);
  assert.equal(writes.length, 1);
  assert.deepEqual(writes[0][1], bytes);
  assert.equal(
    writes[0][2].customMetadata.collectionMode,
    "manual-upload",
  );

  assert.throws(
    () =>
      createUploadedLicensedJsonFeedConnector({
        sourceSlug: "licensed-partner",
        feedUrl: "https://feeds.partner.example/v1/listings",
        allowedHosts: ["feeds.partner.example"],
        maxRecords: 100,
        rawStore: { async put() {} },
        bytes: new Uint8Array(),
      }),
    /approved byte limit/,
  );
});
