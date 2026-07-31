import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import { recordAiEvaluationRun } from "../db/ai-evaluation-runs.ts";
import {
  getReleaseReadinessDashboard,
  recordBackupVerification,
} from "../db/release-readiness.ts";
import { AI_EVALUATION_SUITE_VERSION } from "../lib/ai-evaluation.ts";

const NOW = Date.parse("2026-07-31T12:00:00.000Z");

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
    "drizzle/0008_audit_log_query_indexes.sql",
    "drizzle/0009_backup_restore_evidence.sql",
    "drizzle/0012_ai_evaluation_evidence.sql",
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

test("release readiness exposes evidence-backed blockers without claiming launch readiness", async () => {
  const { database, sqlite } = await createDatabase();
  try {
    const dashboard = await getReleaseReadinessDashboard(
      database,
      "usr_admin",
      { now: NOW },
    );
    assert.equal(dashboard.overall, "BLOCKED");
    assert.ok(dashboard.summary.blocked >= 5);
    assert.equal(dashboard.latestBackup, null);
    assert.equal(gate(dashboard, "external-source").status, "BLOCKED");
    assert.equal(gate(dashboard, "trust-publication").status, "BLOCKED");
    assert.equal(gate(dashboard, "ai-runtime").status, "BLOCKED");
    assert.equal(gate(dashboard, "critical-alerts").status, "PASS");
    assert.equal(gate(dashboard, "admin-redundancy").status, "WARNING");
    assert.equal(dashboard.humanApprovals.length, 5);

    await assert.rejects(
      getReleaseReadinessDashboard(database, "usr_member", { now: NOW }),
      /active administrator/i,
    );
  } finally {
    sqlite.close();
  }
});

test("verified production evidence changes automated release gates to pass", async () => {
  const { database, sqlite } = await createDatabase();
  try {
    sqlite
      .prepare(
        `UPDATE sources
         SET approval_status = 'APPROVED',
             connector_kind = 'LICENSED_JSON_V1',
             approval_expires_at = ?
         WHERE slug = 'realestate-kh'`,
      )
      .run(NOW + 180 * 24 * 60 * 60 * 1000);
    const source = sqlite
      .prepare("SELECT id FROM sources WHERE slug = 'realestate-kh'")
      .get();
    sqlite
      .prepare(
        `INSERT INTO ingestion_runs (
           source_id, status, started_at, ended_at,
           discovered_count, accepted_count, rejected_count, error_summary
         ) VALUES (?, 'SUCCEEDED', ?, ?, 1, 1, 0, NULL)`,
      )
      .run(source.id, NOW - 60_000, NOW - 30_000);
    sqlite
      .prepare(
        `UPDATE trust_score_runs
         SET approved_by_user_id = 'usr_admin', approved_at = ?
         WHERE id = (SELECT MIN(id) FROM trust_score_runs)`,
      )
      .run(NOW - 20_000);
    sqlite
      .prepare(
        `INSERT INTO users (
           id, email, display_name, role, status, created_at, updated_at
         ) VALUES (
           'usr_backup_admin', 'backup-admin@gli.example', 'Backup Admin',
           'ADMIN', 'ACTIVE', ?, ?
         )`,
      )
      .run(NOW, NOW);

    const evidence = await recordBackupVerification(
      database,
      {
        environment: "PRODUCTION",
        storageProvider: "R2",
        objectKey: "backups/production/gli-2026-07-31.sqlite",
        manifestSha256: "a".repeat(64),
        capturedAt: NOW - 10_000,
        restoreTestedAt: NOW - 5_000,
        restoreResult: "SUCCEEDED",
        notes: "restore-drill:GLI-2026-07",
      },
      "usr_admin",
      { now: NOW, requestId: "req_backup_1" },
    );
    assert.equal(evidence.restoreResult, "SUCCEEDED");
    assert.equal(evidence.recordCounts.listings, 8);
    assert.equal(evidence.recordCounts.listingVersions, 8);

    const aiEvaluation = await recordAiEvaluationRun(
      database,
      {
        suiteVersion: AI_EVALUATION_SUITE_VERSION,
        requestedMode: "openai",
        model: "gpt-eval",
        status: "SUCCEEDED",
        passedCount: 5,
        totalCount: 5,
        startedAt: NOW - 20_000,
        completedAt: NOW - 15_000,
        cases: Array.from({ length: 5 }, (_, index) => ({
          id: `case-${index + 1}`,
          label: `Evaluation case ${index + 1}`,
          status: "PASS",
          advisorMode: "openai",
          matchCount: 1,
          checks: [],
        })),
      },
      "usr_admin",
      { now: NOW - 10_000, requestId: "req_ai_eval_1" },
    );
    assert.equal(aiEvaluation.status, "SUCCEEDED");
    await recordAiEvaluationRun(
      database,
      {
        suiteVersion: AI_EVALUATION_SUITE_VERSION,
        requestedMode: "rules",
        model: null,
        status: "SUCCEEDED",
        passedCount: 5,
        totalCount: 5,
        startedAt: NOW - 9_000,
        completedAt: NOW - 8_000,
        cases: Array.from({ length: 5 }, (_, index) => ({
          id: `rules-case-${index + 1}`,
          label: `Rules case ${index + 1}`,
          status: "PASS",
          advisorMode: "rules",
          matchCount: 1,
          checks: [],
        })),
      },
      "usr_admin",
      { now: NOW - 7_000, requestId: "req_ai_eval_rules" },
    );

    const duplicate = await recordBackupVerification(
      database,
      {
        environment: "PRODUCTION",
        storageProvider: "R2",
        objectKey: "backups/production/gli-2026-07-31.sqlite",
        manifestSha256: "a".repeat(64),
        capturedAt: NOW - 10_000,
        restoreTestedAt: NOW - 5_000,
        restoreResult: "SUCCEEDED",
        notes: "restore-drill:GLI-2026-07",
      },
      "usr_admin",
      { now: NOW, requestId: "req_backup_2" },
    );
    assert.equal(duplicate.id, evidence.id);
    assert.equal(
      sqlite
        .prepare("SELECT COUNT(*) AS count FROM backup_verifications")
        .get().count,
      1,
    );
    assert.equal(
      sqlite
        .prepare(
          "SELECT COUNT(*) AS count FROM audit_logs WHERE action = 'BACKUP_EVIDENCE_RECORDED'",
        )
        .get().count,
      1,
    );

    const dashboard = await getReleaseReadinessDashboard(
      database,
      "usr_admin",
      {
        aiConfigured: true,
        paymentConfigured: true,
        schedulerConfigured: true,
        now: NOW,
      },
    );
    assert.equal(dashboard.overall, "PASS");
    assert.deepEqual(dashboard.summary, {
      passed: dashboard.gates.length,
      warnings: 0,
      blocked: 0,
    });
    assert.equal(gate(dashboard, "backup-restore").status, "PASS");
    assert.equal(gate(dashboard, "ai-runtime").status, "PASS");
    assert.equal(dashboard.latestAiEvaluation?.requestedMode, "rules");
  } finally {
    sqlite.close();
  }
});

test("backup evidence validation rejects unsafe or contradictory records", async () => {
  const { database, sqlite } = await createDatabase();
  const valid = {
    environment: "STAGING",
    storageProvider: "CLOUDFLARE_EXPORT",
    objectKey: "backups/staging/gli.sqlite",
    manifestSha256: "b".repeat(64),
    capturedAt: NOW - 10_000,
    restoreTestedAt: null,
    restoreResult: "NOT_TESTED",
    notes: null,
  };
  try {
    await assert.rejects(
      recordBackupVerification(database, valid, "usr_member", { now: NOW }),
      /active administrator/i,
    );
    await assert.rejects(
      recordBackupVerification(
        database,
        { ...valid, objectKey: "../private.sqlite" },
        "usr_admin",
        { now: NOW },
      ),
      /objectKey is invalid/i,
    );
    await assert.rejects(
      recordBackupVerification(
        database,
        { ...valid, manifestSha256: "not-a-hash" },
        "usr_admin",
        { now: NOW },
      ),
      /64-character SHA-256/i,
    );
    await assert.rejects(
      recordBackupVerification(
        database,
        {
          ...valid,
          restoreResult: "SUCCEEDED",
          restoreTestedAt: NOW - 20_000,
        },
        "usr_admin",
        { now: NOW },
      ),
      /cannot be before capturedAt/i,
    );
  } finally {
    sqlite.close();
  }
});

function gate(dashboard, id) {
  const result = dashboard.gates.find((item) => item.id === id);
  assert.ok(result, `Missing gate ${id}`);
  return result;
}
