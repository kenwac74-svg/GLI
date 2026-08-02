import assert from "node:assert/strict";
import test from "node:test";

import { createD1PublicListingQuery } from "../db/d1-assets-query.ts";
import { getAssetDataMode } from "../lib/assets-data.ts";

test("builds a parameterized D1 query with stable filter bindings", async () => {
  let capturedSql = "";
  let capturedValues = [];
  const rows = [{ publicId: "GLI-KH-004" }];
  const database = {
    prepare(sql) {
      capturedSql = sql;
      return {
        bind(...values) {
          capturedValues = values;
          return this;
        },
        async all() {
          return { results: rows };
        },
      };
    },
  };

  const query = createD1PublicListingQuery(database);
  const result = await query({
    status: "ACTIVE",
    country: "Cambodia",
    city: "Phnom Penh",
    transactionType: "rent",
    propertyType: "condo",
    minPriceMinor: 30_000,
    maxPriceMinor: 70_000,
    minBedrooms: 2,
    limit: 20,
    orderBy: [
      { field: "updatedAt", direction: "desc" },
      { field: "trustScore", direction: "desc" },
      { field: "priceMinor", direction: "asc" },
      { field: "publicId", direction: "asc" },
    ],
  });

  assert.deepEqual(result, rows);
  assert.deepEqual(capturedValues, [
    "ACTIVE",
    "Cambodia",
    "Phnom Penh",
    "rent",
    "condo",
    30_000,
    70_000,
    2,
    20,
  ]);
  assert.match(capturedSql, /json_extract/);
  assert.match(capturedSql, /LEFT JOIN listing_sources ls/i);
  assert.match(capturedSql, /s\.slug AS sourceSlug/i);
  assert.match(capturedSql, /ls\.source_url AS sourceUrl/i);
  assert.match(capturedSql, /ORDER BY\s+l\.updated_at DESC/i);
});

test("never interpolates user filter values into D1 SQL", async () => {
  const hostileCity = `Phnom Penh' OR 1=1 --`;
  let capturedSql = "";
  let capturedValues = [];
  const query = createD1PublicListingQuery({
    prepare(sql) {
      capturedSql = sql;
      return {
        bind(...values) {
          capturedValues = values;
          return this;
        },
        async all() {
          return { results: [] };
        },
      };
    },
  });

  await query({
    status: "ACTIVE",
    city: hostileCity,
    limit: 10,
    orderBy: [
      { field: "updatedAt", direction: "desc" },
      { field: "trustScore", direction: "desc" },
      { field: "priceMinor", direction: "asc" },
      { field: "publicId", direction: "asc" },
    ],
  });

  assert.doesNotMatch(capturedSql, /OR 1=1/);
  assert.ok(capturedValues.includes(hostileCity));
});

test("uses only explicit supported data modes", () => {
  assert.equal(getAssetDataMode({}), "approved-fixture");
  assert.equal(getAssetDataMode({ DATA_MODE: "d1" }), "d1");
  assert.throws(
    () => getAssetDataMode({ DATA_MODE: "silent-fallback" }),
    /Unsupported DATA_MODE/,
  );
});
