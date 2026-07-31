import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import {
  loadPendingOperationalNotificationBatch,
  markOperationalNotificationDelivered,
  sendOperationalNotificationBatch,
} from "../db/operations-notifications.ts";
import { enqueueIngestionRetry } from "../db/operations-health.ts";
import { LICENSED_JSON_REQUESTED_FIELDS } from "../ingestion/licensed-json-feed.ts";
import { runScheduledOperations } from "../workers/ingestion/scheduled.ts";

const NOW = new Date("2026-07-31T04:00:00.000Z");
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
    .run(
      "usr_ops_service",
      "operations@gli.example",
      "GLI Operations",
      NOW.getTime(),
      NOW.getTime(),
    );
  sqlite
    .prepare(
      `INSERT INTO users (
         id, email, display_name, role, status, created_at, updated_at
       ) VALUES (?, ?, ?, 'MEMBER', 'ACTIVE', ?, ?)`,
    )
    .run(
      "usr_member",
      "member@gli.example",
      "GLI Member",
      NOW.getTime(),
      NOW.getTime(),
    );
  sqlite
    .prepare(
      `UPDATE sources
       SET approval_expires_at = NULL, updated_at = ?
       WHERE slug = 'approved-fixture'`,
    )
    .run(NOW.getTime());

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

function insertAlert(sqlite) {
  return Number(
    sqlite
      .prepare(
        `INSERT INTO operational_alerts (
           dedupe_key, origin, category, severity, status,
           title, detail, resource_type, resource_id,
           occurrence_count, notified_occurrence_count,
           first_seen_at, last_seen_at, last_notified_at,
           created_at, updated_at
         ) VALUES (
           'test:alert:1', 'HEALTH_SCAN', 'PAYMENT', 'CRITICAL', 'OPEN',
           'Payment processing failed', 'Provider event needs review',
           'PAYMENT_EVENT', '12', 1, 0, ?, ?, NULL, ?, ?
         ) RETURNING id`,
      )
      .get(
        NOW.getTime(),
        NOW.getTime(),
        NOW.getTime(),
        NOW.getTime(),
      ).id,
  );
}

test("notification delivery is allowlisted and occurrence-idempotent", async () => {
  const { database, sqlite } = await createDatabase();
  try {
    const alertId = insertAlert(sqlite);
    const batch = await loadPendingOperationalNotificationBatch(
      database,
      NOW.getTime(),
    );
    assert.equal(batch?.alerts.length, 1);
    assert.equal(batch?.alerts[0].id, alertId);

    let request;
    await sendOperationalNotificationBatch(batch, {
      webhookUrl: "https://alerts.gli.example/v1/events",
      allowedHosts: ["alerts.gli.example"],
      bearerToken: "server-secret",
      fetchImpl: async (input, init) => {
        request = { input: String(input), init };
        return new Response(null, { status: 202 });
      },
    });
    assert.equal(request.input, "https://alerts.gli.example/v1/events");
    assert.equal(request.init.method, "POST");
    assert.equal(request.init.headers.authorization, "Bearer server-secret");
    assert.equal(JSON.parse(request.init.body).schemaVersion, "gli.operations-alerts.v1");

    assert.equal(
      await markOperationalNotificationDelivered(
        database,
        {
          actorUserId: "usr_ops_service",
          alerts: batch.alerts,
        },
        NOW.getTime(),
      ),
      1,
    );
    assert.equal(
      await loadPendingOperationalNotificationBatch(
        database,
        NOW.getTime() + 1000,
      ),
      null,
    );

    let networkCalled = false;
    await assert.rejects(
      sendOperationalNotificationBatch(batch, {
        webhookUrl: "https://unapproved.example/v1/events",
        allowedHosts: ["alerts.gli.example"],
        fetchImpl: async () => {
          networkCalled = true;
          return new Response(null, { status: 202 });
        },
      }),
      /allowlisted HTTPS host/,
    );
    assert.equal(networkCalled, false);
  } finally {
    sqlite.close();
  }
});

test("scheduler scans health and sends an unchanged alert only once", async () => {
  const { database, sqlite } = await createDatabase();
  let webhookCalls = 0;
  try {
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
      .run(NOW.getTime() - 30 * HOUR, NOW.getTime() - 30 * HOUR);
    const env = {
      DB: database,
      FILES: { async put() {} },
      OPERATIONS_ACTOR_USER_ID: "usr_ops_service",
      ALERT_WEBHOOK_URL: "https://alerts.gli.example/v1/events",
      ALERT_WEBHOOK_ALLOWED_HOSTS: "alerts.gli.example",
    };
    const fetchImpl = async (input) => {
      assert.equal(String(input), "https://alerts.gli.example/v1/events");
      webhookCalls += 1;
      return new Response(null, { status: 204 });
    };

    const first = await runScheduledOperations(env, NOW, fetchImpl);
    assert.equal(first.health.activeAlerts, 1);
    assert.equal(first.notification.status, "DELIVERED");
    assert.equal(first.notification.delivered, 1);

    const second = await runScheduledOperations(
      env,
      new Date(NOW.getTime() + 15 * 60 * 1000),
      fetchImpl,
    );
    assert.equal(second.health.activeAlerts, 1);
    assert.equal(second.notification.status, "NO_CHANGES");
    assert.equal(webhookCalls, 1);
  } finally {
    sqlite.close();
  }
});

test("scheduler completes a queued feed retry and clears the recovered failure", async () => {
  const { database, sqlite } = await createDatabase();
  try {
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
        .get(sourceId, NOW.getTime() - HOUR, NOW.getTime() - HOUR).id,
    );
    await enqueueIngestionRetry(
      database,
      {
        sourceSlug: "approved-fixture",
        actorUserId: "usr_ops_service",
        failedRunId,
        error: "Partner timeout",
      },
      NOW.getTime() - 1000,
    );

    const result = await runScheduledOperations(
      {
        DB: database,
        FILES: { async put() {} },
        OPERATIONS_ACTOR_USER_ID: "usr_ops_service",
      },
      NOW,
      async (input) => {
        assert.equal(
          String(input),
          "https://feeds.partner.example/v1/listings",
        );
        return licensedFeedResponse();
      },
    );

    assert.equal(result.retryJobs.processed, 1);
    assert.equal(result.retryJobs.succeeded, 1);
    assert.equal(result.health.activeAlerts, 0);
    assert.equal(result.notification.status, "NO_CHANGES");
    assert.equal(
      sqlite
        .prepare("SELECT status FROM retry_jobs WHERE id = 1")
        .get().status,
      "SUCCEEDED",
    );
  } finally {
    sqlite.close();
  }
});

function licensedFeedResponse() {
  return new Response(
    JSON.stringify({
      schemaVersion: "gli.partner-listings.v1",
      sourceSlug: "approved-fixture",
      generatedAt: NOW.toISOString(),
      listings: [
        {
          externalId: "scheduled-901",
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
          imageUrl: "https://feeds.partner.example/images/scheduled-901.jpg",
          title: "Scheduled partner residence",
          summary: "A licensed structured-feed listing recovered by retry.",
          sourceUrl: "https://feeds.partner.example/listings/scheduled-901",
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
