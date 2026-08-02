import assert from "node:assert/strict";
import test from "node:test";

import { normalizeApprovedFixture } from "../ingestion/normalize.ts";

function fixture(overrides = {}) {
  return {
    country: "Cambodia",
    city: " Phnom   Penh ",
    district: "BKK1",
    transaction: "rent",
    propertyType: "condo",
    price: 500.25,
    currency: "USD",
    areaSqm: 74.5,
    bedrooms: 2,
    bathrooms: 2,
    title: "High-floor 2BR residence",
    summary: "Approved fixture with a river view and furnished interior.",
    sourceExternalKey: "fixture-kh-004",
    sourceUrl: "https://fixtures.example.test/listings/kh-004",
    observedAt: "2026-07-30T09:00:00+07:00",
    ...overrides,
  };
}

test("normalizes approved fixture values to storage units and canonical fields", () => {
  const listing = normalizeApprovedFixture(fixture());

  assert.equal(listing.country, "Cambodia");
  assert.equal(listing.countryCode, "KH");
  assert.equal(listing.city, "Phnom Penh");
  assert.equal(listing.currency, "USD");
  assert.equal(listing.priceMinor, 50_025);
  assert.equal(listing.areaSqmX100, 7_450);
  assert.equal(listing.observedAt, "2026-07-30T02:00:00.000Z");
  assert.match(listing.fingerprint, /^[a-f0-9]{64}$/);
  assert.match(listing.normalizedHash, /^[a-f0-9]{64}$/);
});

test("is deterministic and changes hashes when core fields change", () => {
  const first = normalizeApprovedFixture(fixture());
  const same = normalizeApprovedFixture(structuredClone(fixture()));
  const changedPrice = normalizeApprovedFixture(fixture({ price: 501.25 }));
  const changedBedrooms = normalizeApprovedFixture(fixture({ bedrooms: 1 }));
  const changedCurrency = normalizeApprovedFixture(
    fixture({ currency: "KHR", price: 500.25 }),
  );
  const changedTitle = normalizeApprovedFixture(
    fixture({ title: "Renovated high-floor 2BR residence" }),
  );

  assert.deepEqual(first, same);
  assert.notEqual(first.fingerprint, changedPrice.fingerprint);
  assert.notEqual(first.normalizedHash, changedPrice.normalizedHash);
  assert.notEqual(first.fingerprint, changedBedrooms.fingerprint);
  assert.notEqual(first.normalizedHash, changedBedrooms.normalizedHash);
  assert.notEqual(first.fingerprint, changedCurrency.fingerprint);
  assert.equal(first.fingerprint, changedTitle.fingerprint);
  assert.notEqual(first.normalizedHash, changedTitle.normalizedHash);
});

test("keeps duplicate identity stable across source and observation changes", () => {
  const first = normalizeApprovedFixture(fixture());
  const laterSource = normalizeApprovedFixture(
    fixture({
      sourceExternalKey: "fixture-kh-other",
      sourceUrl: "https://other.example.test/property/42",
      observedAt: "2026-07-31T09:00:00+07:00",
    }),
  );

  assert.equal(first.fingerprint, laterSource.fingerprint);
  assert.notEqual(first.normalizedHash, laterSource.normalizedHash);
});

test("returns an allowlisted public payload without raw input or contact fields", () => {
  const listing = normalizeApprovedFixture(
    fixture({
      ownerName: "Private Owner",
      contactPhone: "+855 12 345 678",
      contactEmail: "owner@example.test",
      rawHtml: "<p>source snapshot belongs outside normalization</p>",
    }),
  );

  assert.deepEqual(Object.keys(listing).sort(), [
    "areaSqmX100",
    "bathrooms",
    "bedrooms",
    "city",
    "country",
    "countryCode",
    "currency",
    "district",
    "fingerprint",
    "imageUrl",
    "normalizedHash",
    "observedAt",
    "priceMinor",
    "propertyType",
    "source",
    "summary",
    "title",
    "transaction",
  ]);
  assert.equal("contactPhone" in listing, false);
  assert.equal("rawHtml" in listing, false);
});

test("rejects contact information embedded in public text or source metadata", () => {
  assert.throws(
    () => normalizeApprovedFixture(fixture({ summary: "Call +855 12 345 678 for details." })),
    /must not contain email addresses or phone numbers/,
  );
  assert.throws(
    () =>
      normalizeApprovedFixture(
        fixture({ sourceUrl: "https://example.test/listing?email=owner@example.test" }),
      ),
    /must not contain contact information/,
  );
});

test("strictly validates enums, units, counts, source URL, and observed time", () => {
  assert.throws(
    () => normalizeApprovedFixture(fixture({ country: "Atlantis" })),
    /supported Southeast Asian country/,
  );
  assert.throws(
    () => normalizeApprovedFixture(fixture({ transaction: "lease" })),
    /transaction must be one of/,
  );
  assert.throws(
    () => normalizeApprovedFixture(fixture({ propertyType: "land" })),
    /propertyType must be one of/,
  );
  assert.equal(
    normalizeApprovedFixture(fixture({ currency: "KHR", price: 4_100_000 })).currency,
    "KHR",
  );
  assert.throws(
    () => normalizeApprovedFixture(fixture({ currency: "BTC" })),
    /currency must be one of/,
  );
  assert.throws(
    () => normalizeApprovedFixture(fixture({ price: 500.123 })),
    /no more than two decimal places/,
  );
  assert.throws(
    () => normalizeApprovedFixture(fixture({ areaSqm: 0 })),
    /positive finite number/,
  );
  assert.throws(
    () => normalizeApprovedFixture(fixture({ bedrooms: 1.5 })),
    /integer between 0 and 100/,
  );
  assert.throws(
    () => normalizeApprovedFixture(fixture({ sourceUrl: "http://example.test/listing" })),
    /must use HTTPS/,
  );
  assert.throws(
    () => normalizeApprovedFixture(fixture({ observedAt: "2026-07-30" })),
    /ISO 8601 timestamp with a timezone/,
  );
});
