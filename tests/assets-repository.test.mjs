import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPublicAssetsQuery,
  createAssetsRepository,
  mapListingRowToAsset,
} from "../db/assets-repository.ts";

function listingRow(overrides = {}) {
  return {
    publicId: "GLI-KH-TEST-1",
    country: "Cambodia",
    city: "Phnom Penh",
    district: null,
    transactionType: "rent",
    propertyType: "condo",
    title: "BKK1 test residence",
    summary: "Verified fixture for repository tests.",
    priceMinor: 50025,
    currency: "USD",
    areaSqmX100: 7450,
    bedrooms: null,
    bathrooms: 2,
    imageUrl: null,
    status: "ACTIVE",
    isGliDirect: 1,
    updatedAt: Date.parse("2026-07-30T00:00:00Z"),
    trustScore: 81,
    trustStatus: "REVIEWING",
    strengthsJson: '["River view","Two bedrooms"]',
    checksJson: null,
    ...overrides,
  };
}

test("maps a D1/Drizzle listing row to the UI Asset without inventing nullable values", () => {
  const asset = mapListingRowToAsset(listingRow());

  assert.deepEqual(asset, {
    id: "GLI-KH-TEST-1",
    country: "Cambodia",
    countryCode: "KH",
    city: "Phnom Penh",
    district: "",
    transaction: "rent",
    propertyType: "condo",
    bedrooms: 0,
    bathrooms: 2,
    title: "BKK1 test residence",
    price: 500.25,
    currency: "USD",
    areaSqm: 74.5,
    image: "",
    summary: "Verified fixture for repository tests.",
    trustScore: 81,
    trustStatus: "REVIEWING",
    isGliDirect: true,
    updatedAt: "2026-07-30T00:00:00.000Z",
    strengths: ["River view", "Two bedrooms"],
    checks: [],
  });
});

test("accepts raw D1 snake_case fields and maps 0/1 booleans explicitly", () => {
  const asset = mapListingRowToAsset({
    public_id: "GLI-KH-TEST-2",
    country: "Cambodia",
    country_code: "KH",
    city: "Siem Reap",
    district: "Svay Dangkum",
    transaction_type: "sale",
    property_type: "villa",
    title: "Garden villa",
    summary: "Test row.",
    price_minor: 12_345_600,
    currency: "USD",
    area_sqm_x100: null,
    bedrooms: 3,
    bathrooms: null,
    image_url: "https://example.test/villa.jpg",
    status: "ACTIVE",
    is_gli_direct: 0,
    updated_at: "2026-07-29T10:00:00+07:00",
  });

  assert.equal(asset.price, 123456);
  assert.equal(asset.areaSqm, 0);
  assert.equal(asset.bathrooms, 0);
  assert.equal(asset.isGliDirect, false);
  assert.equal(asset.trustScore, 0);
  assert.equal(asset.trustStatus, "PRELIMINARY");
  assert.deepEqual(asset.strengths, []);
});

test("publishes an approved source name and safe original listing URL together", () => {
  const asset = mapListingRowToAsset(
    listingRow({
      isGliDirect: 0,
      sourceSlug: "cam-realty-cambodia",
      sourceUrl: "https://camrealtyservice.com/property/example-listing/",
    }),
  );

  assert.equal(asset.sourceName, "CAM Realty");
  assert.equal(
    asset.sourceUrl,
    "https://camrealtyservice.com/property/example-listing/",
  );
  assert.throws(
    () =>
      mapListingRowToAsset(
        listingRow({
          sourceSlug: "cam-realty-cambodia",
          sourceUrl: "javascript:alert(1)",
        }),
      ),
    /safe HTTPS URL/,
  );
  assert.throws(
    () =>
      mapListingRowToAsset(
        listingRow({ sourceSlug: "cam-realty-cambodia" }),
      ),
    /must be provided together/,
  );
});

test("builds an ACTIVE-only query with minor-unit bounds and documented ordering", () => {
  const query = buildPublicAssetsQuery({
    country: "Cambodia",
    city: "Phnom Penh",
    transaction: "rent",
    propertyType: "condo",
    minPrice: 300.1,
    maxPrice: 700.99,
    minBedrooms: 2,
    limit: 20,
  });

  assert.deepEqual(query, {
    status: "ACTIVE",
    country: "Cambodia",
    city: "Phnom Penh",
    transactionType: "rent",
    propertyType: "condo",
    minPriceMinor: 30010,
    maxPriceMinor: 70099,
    minBedrooms: 2,
    limit: 20,
    orderBy: [
      { field: "updatedAt", direction: "desc" },
      { field: "trustScore", direction: "desc" },
      { field: "priceMinor", direction: "asc" },
      { field: "publicId", direction: "asc" },
    ],
  });
});

test("applies ACTIVE filters defensively and returns deterministic order", async () => {
  let receivedQuery;
  const repository = createAssetsRepository(async (query) => {
    receivedQuery = query;
    return [
      listingRow({
        publicId: "OLDER",
        updatedAt: "2026-07-28T00:00:00Z",
        trustScore: 99,
        priceMinor: 40000,
        bedrooms: 2,
      }),
      listingRow({
        publicId: "NEW-LOW-TRUST",
        updatedAt: "2026-07-30T00:00:00Z",
        trustScore: 70,
        priceMinor: 45000,
        bedrooms: 2,
      }),
      listingRow({
        publicId: "NEW-HIGH-TRUST",
        updatedAt: "2026-07-30T00:00:00Z",
        trustScore: 85,
        priceMinor: 50000,
        bedrooms: 2,
      }),
      listingRow({
        publicId: "WRONG-CITY",
        city: "Siem Reap",
        updatedAt: "2026-07-31T00:00:00Z",
        bedrooms: 2,
      }),
    ];
  });

  const assets = await repository.listPublicAssets({
    country: "Cambodia",
    city: "Phnom Penh",
    transaction: "rent",
    minPrice: 350,
    maxPrice: 550,
    minBedrooms: 2,
    limit: 3,
  });

  assert.equal(receivedQuery.status, "ACTIVE");
  assert.deepEqual(
    assets.map((asset) => asset.id),
    ["NEW-HIGH-TRUST", "NEW-LOW-TRUST", "OLDER"],
  );
});

test("rejects inactive, unsupported, or structurally unsafe rows", () => {
  assert.throws(
    () => mapListingRowToAsset(listingRow({ status: "ARCHIVED" })),
    /is not public/,
  );
  assert.equal(
    mapListingRowToAsset(
      listingRow({ currency: "KHR", priceMinor: 410_000_000 }),
    ).currency,
    "KHR",
  );
  assert.throws(
    () => mapListingRowToAsset(listingRow({ currency: "BTC" })),
    /unsupported currency/,
  );
  assert.throws(
    () => mapListingRowToAsset(listingRow({ isGliDirect: "1" })),
    /boolean or 0\/1/,
  );
  assert.throws(
    () => mapListingRowToAsset(listingRow({ country: "Unknown", countryCode: null })),
    /no valid ISO country code/,
  );
  assert.throws(
    () => mapListingRowToAsset(listingRow({ trustScore: 101 })),
    /between 0 and 100/,
  );
});

test("validates filters and does not hide data-source failures behind fixtures", async () => {
  assert.throws(
    () => buildPublicAssetsQuery({ minPrice: 800, maxPrice: 500 }),
    /minPrice cannot exceed maxPrice/,
  );
  assert.throws(
    () => buildPublicAssetsQuery({ limit: 101 }),
    /between 1 and 100/,
  );

  const repository = createAssetsRepository(async () => {
    throw new Error("D1 unavailable");
  });

  await assert.rejects(
    repository.listPublicAssets(),
    /D1 unavailable/,
  );
});
