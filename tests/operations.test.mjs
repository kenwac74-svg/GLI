import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import {
  getOperationsDashboard,
  getListingReviewDetail,
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
    "drizzle/0014_listing_review_decisions.sql",
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
      `INSERT OR IGNORE INTO users (
         id, email, display_name, role, status, created_at, updated_at
       ) VALUES (?, ?, ?, 'ADMIN', 'ACTIVE', ?, ?)`,
    )
    .run(
      "usr_admin",
      "admin@gli.example",
      "GLI Reviewer",
      NOW.getTime(),
      NOW.getTime(),
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
      {
        sourceRightsConfirmed: true,
        factsCrossChecked: true,
        publicCopyReviewed: true,
        limitationsRecorded: true,
        note:
          "Authorized fixture source and normalized public facts were checked; lease evidence remains a follow-up item.",
      },
      NOW.getTime() + 1_000,
    );
    assert.equal(review.status, "ACTIVE");
    assert.equal(review.trustStatus, "REVIEWING");

    dashboard = await getOperationsDashboard(database);
    assert.equal(dashboard.metrics.reviewPending, 0);
    assert.equal(dashboard.metrics.publishedTrustReports, 1);

    const reviewDetail = await getListingReviewDetail(
      database,
      created.publicId,
      "usr_admin",
    );
    assert.equal(reviewDetail.decisions.length, 1);
    assert.equal(reviewDetail.decisions[0].action, "PUBLISH");
    assert.equal(reviewDetail.decisions[0].checklist.factsCrossChecked, true);
    assert.match(reviewDetail.decisions[0].note, /Authorized fixture source/);

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

test("requires complete evidence to publish and records a reason when held", async () => {
  const { database, sqlite } = await createDatabase();
  try {
    const listing = sqlite
      .prepare(
        "SELECT public_id AS publicId FROM listings WHERE public_id = 'GLI-KH-103'",
      )
      .get();

    await assert.rejects(
      reviewListing(
        database,
        listing.publicId,
        "PUBLISH",
        "usr_admin",
        {
          sourceRightsConfirmed: true,
          factsCrossChecked: false,
          publicCopyReviewed: true,
          limitationsRecorded: true,
          note:
            "Price evidence has not yet been cross-checked against the source material.",
        },
        NOW.getTime(),
      ),
      /Every review checklist item/,
    );

    const held = await reviewListing(
      database,
      listing.publicId,
      "HOLD",
      "usr_admin",
      {
        sourceRightsConfirmed: true,
        factsCrossChecked: false,
        publicCopyReviewed: true,
        limitationsRecorded: true,
        note:
          "Hold until the advertised price and completion schedule are independently confirmed.",
      },
      NOW.getTime() + 1_000,
    );
    assert.equal(held.status, "HELD");
    assert.equal(
      sqlite
        .prepare(
          "SELECT count(*) AS count FROM listing_review_decisions WHERE action = 'HOLD'",
        )
        .get().count,
      1,
    );
    assert.equal(
      sqlite
        .prepare(
          "SELECT status FROM listings WHERE public_id = 'GLI-KH-103'",
        )
        .get().status,
      "HELD",
    );
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

