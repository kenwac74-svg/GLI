import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import {
  claimNextIngestionRetry,
  enqueueIngestionRetry,
  failRetryJob,
  getOperationsHealthDashboard,
  runOperationsHealthScan,
  updateOperationalAlert,
} from "../db/operations-health.ts";

const NOW = Date.parse("2026-07-31T03:00:00.000Z");
const HOUR = 60 * 60 * 1000;

async function createDatabase() {
  const sqlite = new DatabaseSync(":memory:");
  for (const file of [
    "drizzle/0000_elite_adam_destine.sql",
    "drizzle/0001_seed_approved_fixture.sql",
    "drizzle/0002_admin_ingestion_pipeline.sql",
    "drizzle/0003_cash_checkout_sessions.sql",
    "drizzle/0004_authorized_source_connectors.sql",
    "drizzle/0005_payment_webhook_ledger.sql",
    "drizzle/0006_operations_health_and_retry.sql",
    "drizzle/0007_operations_notification_delivery.sql",
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
      `INSERT INTO users (
         id, email, display_name, role, status, created_at, updated_at
       ) VALUES (?, ?, ?, 'ADMIN', 'ACTIVE', ?, ?)`,
    )
    .run("usr_admin", "admin@gli.example", "GLI Admin", NOW, NOW);
  sqlite
    .prepare(
      `INSERT INTO users (
         id, email, display_name, role, status, created_at, updated_at
       ) VALUES (?, ?, ?, 'MEMBER', 'ACTIVE', ?, ?)`,
    )
    .run("usr_member", "member@gli.example", "Demo Member", NOW, NOW);

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

test("health scan opens current alerts and resolves recovered conditions", async () => {
  const { database, sqlite } = await createDatabase();
  try {
    const sourceId = sqlite
      .prepare("SELECT id FROM sources WHERE slug = 'approved-fixture'")
      .get().id;
    sqlite
      .prepare(
        `UPDATE sources
         SET approval_expires_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(NOW + 2 * HOUR, NOW, sourceId);
    const failedRunId = Number(
      sqlite
        .prepare(
          `INSERT INTO ingestion_runs (
             source_id, status, started_at, ended_at,
             discovered_count, accepted_count, rejected_count, error_summary
           ) VALUES (?, 'FAILED', ?, ?, 0, 0, 0, 'Partner timeout')
           RETURNING id`,
        )
        .get(sourceId, NOW - HOUR, NOW - HOUR + 1000).id,
    );
    const paymentEventId = Number(
      sqlite
        .prepare(
          `INSERT INTO payment_webhook_events (
             provider, provider_event_id, event_type, payload_hash,
             status, checkout_id, error_summary, received_at,
             processed_at, updated_at
           ) VALUES (
             'demo-provider', 'evt_failed_1', 'checkout.failed', 'hash-1',
             'FAILED', NULL, 'Signature mismatch', ?, NULL, ?
           ) RETURNING id`,
        )
        .get(NOW - HOUR, NOW - HOUR).id,
    );
    sqlite
      .prepare(
        `INSERT INTO consultations (
           id, user_id, listing_id, request_text, preferred_at,
           assignee_user_id, status, created_at, updated_at
         ) VALUES (
           'con_delayed', 'usr_member', NULL, 'Please call me',
           NULL, NULL, 'RECEIVED', ?, ?
         )`,
      )
      .run(NOW - 30 * HOUR, NOW - 30 * HOUR);

    const firstScan = await runOperationsHealthScan(
      database,
      "usr_admin",
      NOW,
    );
    assert.equal(firstScan.activeAlerts, 4);
    assert.equal(firstScan.resolvedAlerts, 0);

    const firstDashboard = await getOperationsHealthDashboard(database);
    assert.equal(firstDashboard.metrics.openCritical, 2);
    assert.equal(firstDashboard.metrics.openWarnings, 2);
    assert.equal(firstDashboard.metrics.pendingNotifications, 4);
    assert.deepEqual(
      new Set(firstDashboard.alerts.map((alert) => alert.category)),
      new Set(["SOURCE_APPROVAL", "INGESTION", "PAYMENT", "CONSULTATION"]),
    );

    const warning = firstDashboard.alerts.find(
      (alert) => alert.category === "CONSULTATION",
    );
    assert.ok(warning);
    const acknowledged = await updateOperationalAlert(
      database,
      {
        alertId: warning.id,
        status: "ACKNOWLEDGED",
        actorUserId: "usr_admin",
      },
      NOW + 1000,
    );
    assert.equal(acknowledged.status, "ACKNOWLEDGED");

    sqlite
      .prepare(
        "UPDATE sources SET approval_expires_at = NULL WHERE id = ?",
      )
      .run(sourceId);
    sqlite
      .prepare("UPDATE ingestion_runs SET status = 'SUCCEEDED' WHERE id = ?")
      .run(failedRunId);
    sqlite
      .prepare(
        "UPDATE payment_webhook_events SET status = 'PROCESSED' WHERE id = ?",
      )
      .run(paymentEventId);
    sqlite
      .prepare(
        "UPDATE consultations SET status = 'COMPLETED', updated_at = ? WHERE id = 'con_delayed'",
      )
      .run(NOW + 2000);

    const secondScan = await runOperationsHealthScan(
      database,
      "usr_admin",
      NOW + 3000,
    );
    assert.equal(secondScan.activeAlerts, 0);
    assert.equal(secondScan.resolvedAlerts, 4);

    const secondDashboard = await getOperationsHealthDashboard(database);
    assert.equal(secondDashboard.metrics.openCritical, 0);
    assert.equal(secondDashboard.metrics.openWarnings, 0);
    assert.equal(secondDashboard.metrics.pendingNotifications, 0);
    assert.equal(
      secondDashboard.alerts.filter((alert) => alert.status === "RESOLVED")
        .length,
      4,
    );
    assert.equal(
      sqlite
        .prepare(
          "SELECT count(*) AS count FROM audit_logs WHERE action = 'OPERATIONS_HEALTH_SCAN_COMPLETED'",
        )
        .get().count,
      2,
    );
  } finally {
    sqlite.close();
  }
});

test("retry jobs back off and move to the dead-letter queue at their limit", async () => {
  const { database, sqlite } = await createDatabase();
  try {
    const sourceId = sqlite
      .prepare("SELECT id FROM sources WHERE slug = 'approved-fixture'")
      .get().id;
    const failedRunId = Number(
      sqlite
        .prepare(
          `INSERT INTO ingestion_runs (
             source_id, status, started_at, ended_at,
             discovered_count, accepted_count, rejected_count, error_summary
           ) VALUES (?, 'FAILED', ?, ?, 0, 0, 0, 'Partner timeout')
           RETURNING id`,
        )
        .get(sourceId, NOW, NOW).id,
    );
    const queued = await enqueueIngestionRetry(
      database,
      {
        sourceSlug: "approved-fixture",
        actorUserId: "usr_admin",
        failedRunId,
        error: "Partner timeout",
        maxAttempts: 2,
      },
      NOW,
    );
    assert.equal(queued.status, "PENDING");

    const firstClaim = await claimNextIngestionRetry(database, NOW);
    assert.equal(firstClaim?.id, queued.id);
    assert.equal(firstClaim?.attemptCount, 1);
    const pending = await failRetryJob(
      database,
      queued.id,
      "Still unavailable",
      NOW + 1000,
    );
    assert.equal(pending.status, "PENDING");

    assert.equal(
      await claimNextIngestionRetry(database, NOW + 60_000),
      null,
    );
    const secondClaim = await claimNextIngestionRetry(database, NOW + 61_000);
    assert.equal(secondClaim?.attemptCount, 2);
    const deadLetter = await failRetryJob(
      database,
      queued.id,
      "Final failure",
      NOW + 62_000,
    );
    assert.equal(deadLetter.status, "DEAD_LETTER");

    const dashboard = await getOperationsHealthDashboard(database);
    assert.equal(dashboard.metrics.pendingRetries, 0);
    assert.equal(dashboard.metrics.deadLetters, 1);
    assert.equal(dashboard.metrics.openCritical, 1);
    assert.equal(dashboard.retryJobs[0].status, "DEAD_LETTER");
  } finally {
    sqlite.close();
  }
});
