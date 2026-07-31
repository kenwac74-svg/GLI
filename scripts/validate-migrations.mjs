import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";

const migrationFiles = [
  "drizzle/0000_elite_adam_destine.sql",
  "drizzle/0001_seed_approved_fixture.sql",
  "drizzle/0002_admin_ingestion_pipeline.sql",
  "drizzle/0003_cash_checkout_sessions.sql",
  "drizzle/0004_authorized_source_connectors.sql",
  "drizzle/0005_payment_webhook_ledger.sql",
  "drizzle/0006_operations_health_and_retry.sql",
];
const database = new DatabaseSync(":memory:");

try {
  for (const file of migrationFiles) {
    const sql = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    for (const statement of sql
      .split("--> statement-breakpoint")
      .map((value) => value.trim())
      .filter(Boolean)) {
      database.exec(statement);
    }
  }

  const counts = database
    .prepare(`
      SELECT
        (SELECT count(*) FROM listings) AS listings,
        (SELECT count(*) FROM listing_sources) AS listingSources,
        (SELECT count(*) FROM listing_versions) AS listingVersions,
        (SELECT count(*) FROM trust_score_runs) AS trustScores
    `)
    .get();
  assert.deepEqual({ ...counts }, {
    listings: 8,
    listingSources: 8,
    listingVersions: 8,
    trustScores: 8,
  });

  const sample = database
    .prepare(`
      SELECT
        json_type(normalized_payload_json, '$.strengths') AS strengthsType,
        json_type(normalized_payload_json, '$.checks') AS checksType
      FROM listing_versions
      WHERE listing_id = (SELECT id FROM listings WHERE public_id = 'GLI-KH-004')
    `)
    .get();
  assert.deepEqual({ ...sample }, {
    strengthsType: "array",
    checksType: "array",
  });

  const directCount = database
    .prepare("SELECT count(*) AS count FROM listings WHERE is_gli_direct = 1")
    .get();
  assert.equal(directCount.count, 3);

  const fingerprintColumn = database
    .prepare(
      "SELECT count(*) AS count FROM pragma_table_info('listings') WHERE name = 'fingerprint'",
    )
    .get();
  assert.equal(fingerprintColumn.count, 1);

  const fingerprintIndex = database
    .prepare(
      "SELECT count(*) AS count FROM pragma_index_list('listings') WHERE name = 'listings_fingerprint_idx'",
    )
    .get();
  assert.equal(fingerprintIndex.count, 1);

  const checkoutTable = database
    .prepare(
      "SELECT count(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'cash_checkout_sessions'",
    )
    .get();
  assert.equal(checkoutTable.count, 1);

  const sourceConnectorColumns = database
    .prepare(
      `SELECT count(*) AS count
       FROM pragma_table_info('sources')
       WHERE name IN (
         'connector_kind',
         'connector_config_json',
         'allowed_hosts_json',
         'max_records_per_run',
         'approval_reference',
         'approved_by_user_id',
         'policy_reviewed_at'
       )`,
    )
    .get();
  assert.equal(sourceConnectorColumns.count, 7);

  const sourceReadiness = database
    .prepare(
      `SELECT
         (SELECT count(*) FROM sources) AS sources,
         (SELECT count(*) FROM sources WHERE approval_status = 'APPROVED') AS approved,
         (SELECT count(*) FROM sources WHERE connector_kind = 'DISABLED') AS disabled`,
    )
    .get();
  assert.deepEqual({ ...sourceReadiness }, {
    sources: 4,
    approved: 1,
    disabled: 3,
  });

  const paymentLedger = database
    .prepare(
      `SELECT
         (SELECT count(*) FROM sqlite_master
          WHERE type = 'table' AND name = 'payment_webhook_events') AS tableCount,
         (SELECT count(*) FROM pragma_index_list('payment_webhook_events')
          WHERE name = 'payment_webhook_provider_event_uidx') AS eventIndex,
         (SELECT count(*) FROM pragma_index_list('cash_checkout_sessions')
          WHERE name = 'cash_checkout_provider_session_uidx') AS sessionIndex`,
    )
    .get();
  assert.deepEqual({ ...paymentLedger }, {
    tableCount: 1,
    eventIndex: 1,
    sessionIndex: 1,
  });

  const operationsHealth = database
    .prepare(
      `SELECT
         (SELECT count(*) FROM sqlite_master
          WHERE type = 'table' AND name = 'operational_alerts') AS alertTable,
         (SELECT count(*) FROM sqlite_master
          WHERE type = 'table' AND name = 'retry_jobs') AS retryTable,
         (SELECT count(*) FROM pragma_index_list('operational_alerts')
          WHERE name = 'operational_alerts_dedupe_uidx') AS alertDedupeIndex,
         (SELECT count(*) FROM pragma_index_list('retry_jobs')
          WHERE name = 'retry_jobs_status_available_idx') AS retryStatusIndex`,
    )
    .get();
  assert.deepEqual({ ...operationsHealth }, {
    alertTable: 1,
    retryTable: 1,
    alertDedupeIndex: 1,
    retryStatusIndex: 1,
  });

  console.log(
    "D1 migrations validated: listings, Trust scores, authorized connectors, payments, and operations health.",
  );
} finally {
  database.close();
}
