import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import {
  configureLicensedSource,
  getSourceConnectorConfiguration,
  getSourceManagementDetail,
  suspendSourceConnector,
} from "../db/operations.ts";
import {
  LICENSED_JSON_CONNECTOR_KIND,
  LICENSED_JSON_REQUESTED_FIELDS,
} from "../ingestion/licensed-json-feed.ts";

const NOW = Date.parse("2026-07-31T05:00:00.000Z");

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
    .run("usr_member", "member@gli.example", "GLI Member", NOW, NOW);

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

test("administrator approves a licensed feed without storing its secret value", async () => {
  const { database, sqlite } = await createDatabase();
  try {
    const expiresAt = NOW + 180 * 24 * 60 * 60 * 1000;
    const configured = await configureLicensedSource(
      database,
      {
        sourceSlug: "realestate-kh",
        approvalReference: "contract:GLI-REKH-2026-001",
        approvalExpiresAt: expiresAt,
        feedUrl: "https://partner.realestate.com.kh/gli/v1/listings",
        authorizationSecretName: "SOURCE_SECRET_REALESTATE_KH",
        maxRecordsPerRun: 250,
      },
      "usr_admin",
      NOW,
    );

    assert.equal(configured.approvalStatus, "APPROVED");
    assert.equal(configured.connectorKind, LICENSED_JSON_CONNECTOR_KIND);
    assert.equal(
      configured.feedUrl,
      "https://partner.realestate.com.kh/gli/v1/listings",
    );
    assert.deepEqual(configured.allowedHosts, [
      "partner.realestate.com.kh",
    ]);
    assert.deepEqual(
      configured.permittedFields,
      LICENSED_JSON_REQUESTED_FIELDS,
    );
    assert.equal(
      configured.authorizationSecretName,
      "SOURCE_SECRET_REALESTATE_KH",
    );
    assert.equal(configured.approvalExpiresAt, expiresAt);

    const raw = sqlite
      .prepare(
        `SELECT connector_config_json AS connectorConfigJson,
                approved_by_user_id AS approvedByUserId,
                policy_reviewed_at AS policyReviewedAt
         FROM sources WHERE slug = 'realestate-kh'`,
      )
      .get();
    assert.equal(raw.approvedByUserId, "usr_admin");
    assert.equal(raw.policyReviewedAt, NOW);
    assert.equal(
      JSON.parse(raw.connectorConfigJson).authorizationSecretName,
      "SOURCE_SECRET_REALESTATE_KH",
    );
    assert.doesNotMatch(raw.connectorConfigJson, /Bearer|secret-value/i);

    const connector = await getSourceConnectorConfiguration(
      database,
      "realestate-kh",
    );
    assert.equal(connector.policy.approvalStatus, "APPROVED");
    assert.deepEqual(connector.policy.allowedHosts, [
      "partner.realestate.com.kh",
    ]);
    assert.equal(
      sqlite
        .prepare(
          "SELECT count(*) AS count FROM audit_logs WHERE action = 'SOURCE_CONNECTOR_APPROVED'",
        )
        .get().count,
      1,
    );
  } finally {
    sqlite.close();
  }
});

test("administrator can suspend a configured source idempotently", async () => {
  const { database, sqlite } = await createDatabase();
  try {
    await configureLicensedSource(
      database,
      {
        sourceSlug: "fazwaz-kh",
        approvalReference: "contract:GLI-FWKH-2026-001",
        approvalExpiresAt: null,
        feedUrl: "https://feed.fazwaz-kh.com/gli/listings",
        authorizationSecretName: null,
        maxRecordsPerRun: 100,
      },
      "usr_admin",
      NOW,
    );
    const suspended = await suspendSourceConnector(
      database,
      "fazwaz-kh",
      "usr_admin",
      NOW + 1000,
    );
    assert.equal(suspended.approvalStatus, "SUSPENDED");
    assert.equal(
      suspended.feedUrl,
      "https://feed.fazwaz-kh.com/gli/listings",
    );

    const repeated = await suspendSourceConnector(
      database,
      "fazwaz-kh",
      "usr_admin",
      NOW + 2000,
    );
    assert.equal(repeated.approvalStatus, "SUSPENDED");
    assert.equal(
      sqlite
        .prepare(
          "SELECT count(*) AS count FROM audit_logs WHERE action = 'SOURCE_CONNECTOR_SUSPENDED'",
        )
        .get().count,
      1,
    );
  } finally {
    sqlite.close();
  }
});

test("source approval rejects unsafe endpoints, secret names, expiry, and non-admin actors", async () => {
  const { database, sqlite } = await createDatabase();
  const base = {
    sourceSlug: "khmer24-cambodia",
    approvalReference: "contract:GLI-KH24-2026-001",
    approvalExpiresAt: NOW + 30 * 24 * 60 * 60 * 1000,
    feedUrl: "https://feed.khmer24.com/gli/listings",
    authorizationSecretName: "SOURCE_SECRET_KHMER24",
    maxRecordsPerRun: 100,
  };
  try {
    await assert.rejects(
      configureLicensedSource(
        database,
        { ...base, feedUrl: "https://127.0.0.1/listings" },
        "usr_admin",
        NOW,
      ),
      /public HTTPS host/,
    );
    await assert.rejects(
      configureLicensedSource(
        database,
        { ...base, authorizationSecretName: "KHMER24_TOKEN" },
        "usr_admin",
        NOW,
      ),
      /SOURCE_SECRET_/,
    );
    await assert.rejects(
      configureLicensedSource(
        database,
        {
          ...base,
          approvalExpiresAt: NOW + 3 * 365 * 24 * 60 * 60 * 1000,
        },
        "usr_admin",
        NOW,
      ),
      /within two years/,
    );
    await assert.rejects(
      configureLicensedSource(database, base, "usr_member", NOW),
      /active administrator/,
    );
    await assert.rejects(
      getSourceManagementDetail(
        database,
        "khmer24-cambodia",
        "usr_member",
      ),
      /active administrator/,
    );

    const unchanged = await getSourceManagementDetail(
      database,
      "khmer24-cambodia",
      "usr_admin",
    );
    assert.equal(unchanged.approvalStatus, "PENDING");
    assert.equal(unchanged.connectorKind, "DISABLED");
    assert.equal(
      sqlite
        .prepare(
          "SELECT count(*) AS count FROM audit_logs WHERE resource_id = 'khmer24-cambodia'",
        )
        .get().count,
      0,
    );
  } finally {
    sqlite.close();
  }
});
