import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import {
  categoryForAction,
  getAuditDashboard,
  parseAndRedact,
} from "../db/audit-log.ts";

const NOW = Date.parse("2026-07-31T10:00:00.000Z");

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
       ) VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)`,
    )
    .run(
      "usr_admin",
      "admin@gli.example",
      "GLI Admin",
      "ADMIN",
      NOW,
      NOW,
    );
  sqlite
    .prepare(
      `INSERT INTO users (
         id, email, display_name, role, status, created_at, updated_at
       ) VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)`,
    )
    .run(
      "usr_member",
      "member@gli.example",
      "GLI Member",
      "MEMBER",
      NOW,
      NOW,
    );

  const insert = sqlite.prepare(
    `INSERT INTO audit_logs (
       actor_user_id, action, resource_type, resource_id,
       before_json, after_json, request_id, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  insert.run(
    "usr_admin",
    "SOURCE_CONNECTOR_APPROVED",
    "source",
    "realestate-kh",
    null,
    JSON.stringify({
      feedUrl: "https://partner.example.com/listings",
      authorizationSecretName: "SOURCE_SECRET_REALESTATE_KH",
      nested: { apiKey: "must-not-leak", visible: "kept" },
    }),
    "req_source",
    NOW - 60_000,
  );
  insert.run(
    "usr_member",
    "CONSULTATION_CREATED",
    "consultation",
    "csl_1",
    null,
    JSON.stringify({ status: "RECEIVED" }),
    "req_consultation",
    NOW - 2 * 60 * 60 * 1000,
  );
  insert.run(
    "usr_admin",
    "INGESTION_RUN_FAILED",
    "ingestion_run",
    "42",
    null,
    "{broken",
    null,
    NOW - 8 * 24 * 60 * 60 * 1000,
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

test("administrator reads categorized audit events and operational metrics", async () => {
  const { database, sqlite } = await createDatabase();
  try {
    const dashboard = await getAuditDashboard(database, "usr_admin", {
      category: "ALL",
      limit: 20,
      now: NOW,
    });

    assert.equal(dashboard.metrics.totalEvents, 3);
    assert.equal(dashboard.metrics.last24Hours, 2);
    assert.equal(dashboard.metrics.attentionEvents, 1);
    assert.equal(dashboard.metrics.sourceEvents, 2);
    assert.deepEqual(
      dashboard.events.map((event) => event.action),
      [
        "SOURCE_CONNECTOR_APPROVED",
        "CONSULTATION_CREATED",
        "INGESTION_RUN_FAILED",
      ],
    );
    assert.equal(dashboard.events[0].actorName, "GLI Admin");
    assert.equal(dashboard.events[0].category, "SOURCE");
  } finally {
    sqlite.close();
  }
});

test("audit category filter returns only the selected workflow", async () => {
  const { database, sqlite } = await createDatabase();
  try {
    const dashboard = await getAuditDashboard(database, "usr_admin", {
      category: "CONSULTATION",
      now: NOW,
    });
    assert.equal(dashboard.category, "CONSULTATION");
    assert.equal(dashboard.events.length, 1);
    assert.equal(dashboard.events[0].action, "CONSULTATION_CREATED");
    assert.equal(dashboard.events[0].actorEmail, "member@gli.example");
  } finally {
    sqlite.close();
  }
});

test("audit output recursively redacts secrets and tolerates invalid JSON", async () => {
  const { database, sqlite } = await createDatabase();
  try {
    const dashboard = await getAuditDashboard(database, "usr_admin", {
      category: "SOURCE",
      now: NOW,
    });
    assert.deepEqual(dashboard.events[0].after, {
      feedUrl: "https://partner.example.com/listings",
      authorizationSecretName: "[REDACTED]",
      nested: { apiKey: "[REDACTED]", visible: "kept" },
    });
    assert.equal(parseAndRedact("{broken"), "[INVALID JSON]");
    assert.deepEqual(parseAndRedact('{"header":"Bearer abc123"}'), {
      header: "[REDACTED]",
    });
  } finally {
    sqlite.close();
  }
});

test("audit access and query options fail closed", async () => {
  const { database, sqlite } = await createDatabase();
  try {
    await assert.rejects(
      getAuditDashboard(database, "usr_member", { now: NOW }),
      /active administrator/i,
    );
    await assert.rejects(
      getAuditDashboard(database, "usr_admin", {
        category: "UNSUPPORTED",
        now: NOW,
      }),
      /supported audit category/i,
    );
    await assert.rejects(
      getAuditDashboard(database, "usr_admin", { limit: 101, now: NOW }),
      /between 1 and 100/i,
    );
    assert.equal(categoryForAction("CASH_MEMBERSHIP_ACTIVATED"), "MEMBERSHIP");
    assert.equal(
      categoryForAction("DEMO_CASH_MEMBERSHIP_ACTIVATED"),
      "MEMBERSHIP",
    );
    assert.equal(categoryForAction("OPERATIONS_HEALTH_SCAN_COMPLETED"), "OPERATIONS");
  } finally {
    sqlite.close();
  }
});

