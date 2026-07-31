import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import { LICENSED_JSON_REQUESTED_FIELDS } from "../ingestion/licensed-json-feed.ts";
import { executeLicensedFeedJob } from "../workers/ingestion/index.ts";

const NOW = new Date("2026-07-31T02:30:00.000Z");

async function createDatabase() {
  const sqlite = new DatabaseSync(":memory:");
  for (const file of [
    "drizzle/0000_elite_adam_destine.sql",
    "drizzle/0001_seed_approved_fixture.sql",
    "drizzle/0002_admin_ingestion_pipeline.sql",
    "drizzle/0003_cash_checkout_sessions.sql",
    "drizzle/0004_authorized_source_connectors.sql",
  ]) {
    const sql = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    for (const statement of sql
      .split("--> statement-breakpoint")
      .map((value) => value.trim())
      .filter(Boolean)) {
      sqlite.exec(statement);
    }
  }

  sqlite
    .prepare(
      `UPDATE sources
       SET connector_kind = 'LICENSED_JSON_V1',
           connector_config_json = ?,
           allowed_hosts_json = ?,
           permitted_fields_json = ?,
           max_records_per_run = 25
       WHERE slug = 'approved-fixture'`,
    )
    .run(
      JSON.stringify({
        feedUrl: "https://feeds.partner.example/v1/listings",
      }),
      JSON.stringify(["feeds.partner.example"]),
      JSON.stringify(LICENSED_JSON_REQUESTED_FIELDS),
    );

  const database = {
    prepare(sql) {
      let bindings = [];
      return {
        bind(...values) {
          bindings = values;
          return this;
        },
        async first() {
          return sqlite.prepare(sql).get(...bindings) ?? null;
        },
        async all() {
          return {
            results: sqlite.prepare(sql).all(...bindings),
            success: true,
          };
        },
        async run() {
          const result = sqlite.prepare(sql).run(...bindings);
          return {
            success: true,
            meta: { changes: Number(result.changes) },
          };
        },
      };
    },
  };
  return { database, sqlite };
}

function feedResponse() {
  return new Response(
    JSON.stringify({
      schemaVersion: "gli.partner-listings.v1",
      sourceSlug: "approved-fixture",
      generatedAt: NOW.toISOString(),
      listings: [
        {
          externalId: "licensed-901",
          country: "Cambodia",
          city: "Phnom Penh",
          district: "Daun Penh",
          transaction: "rent",
          propertyType: "condo",
          price: 725,
          currency: "USD",
          areaSqm: 62,
          bedrooms: 1,
          bathrooms: 1,
          imageUrl: "https://feeds.partner.example/images/licensed-901.jpg",
          title: "Licensed Daun Penh partner residence",
          summary:
            "A licensed structured-feed listing awaiting GLI operational review.",
          sourceUrl: "https://feeds.partner.example/listings/licensed-901",
          observedAt: NOW.toISOString(),
        },
      ],
    }),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    },
  );
}

test("worker stores the raw feed, links provenance, and leaves the listing private", async () => {
  const { database, sqlite } = await createDatabase();
  const rawWrites = [];
  try {
    const result = await executeLicensedFeedJob(
      { sourceSlug: "approved-fixture", actorUserId: "usr_admin" },
      {
        database,
        rawStore: {
          async put(...args) {
            rawWrites.push(args);
          },
        },
        fetchImpl: async () => feedResponse(),
        now: () => NOW,
      },
    );

    assert.equal(result.status, "SUCCEEDED");
    assert.equal(result.acceptedCount, 1);
    assert.equal(rawWrites.length, 1);

    const listing = sqlite
      .prepare(
        `SELECT l.public_id AS publicId, l.status, lv.raw_snapshot_id AS rawSnapshotId
         FROM listings l
         JOIN listing_versions lv ON lv.listing_id = l.id
         WHERE l.title = 'Licensed Daun Penh partner residence'`,
      )
      .get();
    assert.match(listing.publicId, /^GLI-KH-[A-F0-9]{8}$/);
    assert.equal(listing.status, "REVIEW_PENDING");
    assert.equal(typeof listing.rawSnapshotId, "number");

    const snapshot = sqlite
      .prepare(
        "SELECT object_key AS objectKey, http_status AS httpStatus FROM raw_snapshots",
      )
      .get();
    assert.equal(snapshot.objectKey, rawWrites[0][0]);
    assert.equal(snapshot.httpStatus, 200);
  } finally {
    sqlite.close();
  }
});

test("worker records connector failures without creating or publishing a listing", async () => {
  const { database, sqlite } = await createDatabase();
  try {
    await assert.rejects(
      executeLicensedFeedJob(
        { sourceSlug: "approved-fixture", actorUserId: "usr_admin" },
        {
          database,
          rawStore: { async put() {} },
          fetchImpl: async () =>
            new Response("upstream unavailable", { status: 503 }),
          now: () => NOW,
        },
      ),
      /HTTP 503/,
    );

    const run = sqlite
      .prepare(
        "SELECT status, error_summary AS errorSummary FROM ingestion_runs ORDER BY id DESC LIMIT 1",
      )
      .get();
    assert.equal(run.status, "FAILED");
    assert.match(run.errorSummary, /HTTP 503/);
    assert.equal(
      sqlite
        .prepare(
          "SELECT count(*) AS count FROM audit_logs WHERE action = 'INGESTION_RUN_FAILED'",
        )
        .get().count,
      1,
    );
    assert.equal(
      sqlite
        .prepare(
          "SELECT count(*) AS count FROM listings WHERE title = 'Licensed Daun Penh partner residence'",
        )
        .get().count,
      0,
    );
  } finally {
    sqlite.close();
  }
});
