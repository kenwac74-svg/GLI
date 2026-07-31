import assert from "node:assert/strict";
import test from "node:test";

import {
  createUploadedLicensedCsvFeedConnector,
  parseLicensedCsv,
} from "../ingestion/licensed-csv-feed.ts";
import {
  LICENSED_JSON_CONNECTOR_KIND,
  LICENSED_JSON_REQUESTED_FIELDS,
} from "../ingestion/licensed-json-feed.ts";

const NOW = new Date("2026-07-31T03:00:00.000Z");

function row(overrides = {}) {
  return {
    externalId: "partner-csv-101",
    country: "Cambodia",
    city: "Phnom Penh",
    district: "BKK1",
    transaction: "rent",
    propertyType: "condo",
    price: "725.50",
    currency: "USD",
    areaSqm: "58.25",
    bedrooms: "1",
    bathrooms: "1",
    imageUrl: "https://feeds.partner.example/images/partner-csv-101.jpg",
    title: "Licensed partner residence, BKK1",
    summary:
      'Structured "partner" listing prepared for GLI review.\nSecond line.',
    sourceUrl: "https://feeds.partner.example/listings/partner-csv-101",
    observedAt: NOW.toISOString(),
    ...overrides,
  };
}

function csv(records = [row()]) {
  const lines = [LICENSED_JSON_REQUESTED_FIELDS.join(",")];
  for (const record of records) {
    lines.push(
      LICENSED_JSON_REQUESTED_FIELDS.map((field) =>
        quoteCsv(String(record[field] ?? "")),
      ).join(","),
    );
  }
  return `${lines.join("\r\n")}\r\n`;
}

function quoteCsv(value) {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

test("collects an uploaded UTF-8 CSV and preserves its exact raw bytes", async () => {
  const writes = [];
  const bytes = new TextEncoder().encode(`\uFEFF${csv()}`);
  const connector = createUploadedLicensedCsvFeedConnector({
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

  const batch = await connector.collect();
  assert.equal(connector.connectorKind, LICENSED_JSON_CONNECTOR_KIND);
  assert.equal(batch.candidates.length, 1);
  assert.equal(batch.candidates[0].price, 725.5);
  assert.equal(batch.candidates[0].areaSqm, 58.25);
  assert.equal(batch.candidates[0].bedrooms, 1);
  assert.equal(batch.candidates[0].title, "Licensed partner residence, BKK1");
  assert.match(batch.candidates[0].summary, /Second line/);
  assert.match(batch.snapshot.objectKey, /\.csv$/);
  assert.equal(writes.length, 1);
  assert.deepEqual(writes[0][1], bytes);
  assert.equal(
    writes[0][2].httpMetadata.contentType,
    "text/csv; charset=utf-8",
  );
  assert.equal(writes[0][2].customMetadata.collectionMode, "manual-upload");
  assert.equal(writes[0][2].customMetadata.feedFormat, "csv");
});

test("rejects malformed, unexpected, and incomplete CSV contracts", () => {
  const valid = csv();
  const duplicateHeader = valid.replace(
    "externalId,country",
    "externalId,externalId",
  );
  assert.throws(
    () => parseLicensedCsv(new TextEncoder().encode(duplicateHeader), 100),
    /duplicate header/,
  );

  const unknownHeader = valid.replace("externalId", "contactPhone");
  assert.throws(
    () => parseLicensedCsv(new TextEncoder().encode(unknownHeader), 100),
    /unsupported header/,
  );

  const missingHeader = valid
    .split(/\r?\n/)
    .map((line) => line.replace(",imageUrl", ""))
    .join("\r\n");
  assert.throws(
    () => parseLicensedCsv(new TextEncoder().encode(missingHeader), 100),
    /missing required headers/,
  );

  assert.throws(
    () =>
      parseLicensedCsv(
        new TextEncoder().encode(
          valid.replace(
            '"Licensed partner residence, BKK1"',
            '"Licensed partner residence, BKK1',
          ),
        ),
        100,
      ),
    /closing quote|unterminated quoted field/,
  );
});

test("rejects invalid UTF-8, row-width mismatch, and record overflow", () => {
  assert.throws(
    () => parseLicensedCsv(Uint8Array.from([0xc3, 0x28]), 100),
    /valid UTF-8/,
  );

  const shortRow = csv().replace(`,${NOW.toISOString()}`, "");
  assert.throws(
    () => parseLicensedCsv(new TextEncoder().encode(shortRow), 100),
    /columns; expected/,
  );

  assert.throws(
    () =>
      parseLicensedCsv(
        new TextEncoder().encode(
          csv([row(), row({ externalId: "partner-csv-102" })]),
        ),
        1,
      ),
    /approved record limit/,
  );
});

