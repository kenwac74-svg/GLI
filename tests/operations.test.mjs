import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import {
  getOperationsDashboard,
  reviewListing,
  runApprovedFixtureIngestion,
} from "../db/operations.ts";
import {
  APPROVED_FIXTURE_REQUESTED_FIELDS,
  createApprovedDemoFeed,
} from "../ingestion/demo-feed.ts";

const NOW = new Date("2026-07-30T12:00:00.000Z");

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

test("ingests an approved batch, keeps new assets private, and publishes after review", async () => {
  const { database, sqlite } = await createDatabase();
  try {
    const result = await runApprovedFixtureIngestion(
      database,
      "approved-fixture",
      APPROVED_FIXTURE_REQUESTED_FIELDS,
      createApprovedDemoFeed(NOW.toISOString()),
      "usr_admin",
      NOW,
    );

    assert.equal(result.status, "SUCCEEDED");
    assert.equal(result.acceptedCount, 2);
    assert.equal(result.rejectedCount, 0);
    assert.equal(new Set(result.listingPublicIds).size, 2);

    const created = sqlite
      .prepare(
        "SELECT public_id AS publicId, status FROM listings WHERE title = ?",
      )
      .get("Tonle Bassac serviced 1BR residence");
    assert.match(created.publicId, /^GLI-KH-[A-F0-9]{8}$/);
    assert.equal(created.status, "REVIEW_PENDING");

    let dashboard = await getOperationsDashboard(database);
    assert.equal(dashboard.metrics.approvedSources, 1);
    assert.equal(dashboard.metrics.reviewPending, 1);
    assert.equal(dashboard.runs[0].status, "SUCCEEDED");
    assert.equal(dashboard.runs[0].acceptedCount, 2);

    const review = await reviewListing(
      database,
      created.publicId,
      "PUBLISH",
      "usr_admin",
      NOW.getTime() + 1_000,
    );
    assert.equal(review.status, "ACTIVE");
    assert.equal(review.trustStatus, "REVIEWING");

    dashboard = await getOperationsDashboard(database);
    assert.equal(dashboard.metrics.reviewPending, 0);
    assert.equal(dashboard.metrics.publishedTrustReports, 1);

    const auditActions = sqlite
      .prepare(
        "SELECT action FROM audit_logs WHERE resource_id = ? ORDER BY id",
      )
      .all(created.publicId)
      .map((row) => row.action);
    assert.deepEqual(auditActions, [
      "LISTING_INGESTED",
      "LISTING_PUBLISHED",
    ]);
  } finally {
    sqlite.close();
  }
});

test("re-running the feed is idempotent for listings and normalized versions", async () => {
  const { database, sqlite } = await createDatabase();
  try {
    const feed = createApprovedDemoFeed(NOW.toISOString());
    await runApprovedFixtureIngestion(
      database,
      "approved-fixture",
      APPROVED_FIXTURE_REQUESTED_FIELDS,
      feed,
      "usr_admin",
      NOW,
    );
    await runApprovedFixtureIngestion(
      database,
      "approved-fixture",
      APPROVED_FIXTURE_REQUESTED_FIELDS,
      feed,
      "usr_admin",
      new Date(NOW.getTime() + 60_000),
    );

    assert.equal(
      sqlite.prepare("SELECT count(*) AS count FROM listings").get().count,
      9,
    );
    assert.equal(
      sqlite
        .prepare(
          "SELECT count(*) AS count FROM listing_versions WHERE normalized_hash NOT LIKE 'approved-fixture-v1-%'",
        )
        .get().count,
      2,
    );
  } finally {
    sqlite.close();
  }
});

test("blocks collection immediately when source approval is suspended", async () => {
  const { database, sqlite } = await createDatabase();
  try {
    sqlite
      .prepare(
        "UPDATE sources SET approval_status = 'SUSPENDED' WHERE slug = 'approved-fixture'",
      )
      .run();

    await assert.rejects(
      runApprovedFixtureIngestion(
        database,
        "approved-fixture",
        APPROVED_FIXTURE_REQUESTED_FIELDS,
        createApprovedDemoFeed(NOW.toISOString()),
        "usr_admin",
        NOW,
      ),
      /NOT_APPROVED/,
    );
    assert.equal(
      sqlite.prepare("SELECT count(*) AS count FROM ingestion_runs").get().count,
      0,
    );
  } finally {
    sqlite.close();
  }
});
