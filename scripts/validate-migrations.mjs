import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";

const migrationFiles = [
  "drizzle/0000_elite_adam_destine.sql",
  "drizzle/0001_seed_approved_fixture.sql",
  "drizzle/0002_admin_ingestion_pipeline.sql",
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

  console.log(
    "D1 migrations validated: 8 listings, versions, Trust scores, and ingestion fingerprint index.",
  );
} finally {
  database.close();
}
