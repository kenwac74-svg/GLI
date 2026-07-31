import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import { env as cloudflareEnv } from "./support/cloudflare-workers-shim.mjs";

const APP_ORIGIN = "http://localhost";
const MEMBER_EMAIL = "member.e2e@gli.example";
const ADMIN_EMAIL = "admin.e2e@gli.example";

class SQLiteD1Statement {
  constructor(sqlite, sql) {
    this.sqlite = sqlite;
    this.sql = sql;
    this.bindings = [];
  }

  bind(...values) {
    this.bindings = values;
    return this;
  }

  async first() {
    return this.sqlite.prepare(this.sql).get(...this.bindings) ?? null;
  }

  async all() {
    return {
      results: this.sqlite.prepare(this.sql).all(...this.bindings),
      success: true,
    };
  }

  async run() {
    const result = this.sqlite.prepare(this.sql).run(...this.bindings);
    return {
      success: true,
      meta: {
        changes: Number(result.changes),
        last_row_id: Number(result.lastInsertRowid),
      },
    };
  }
}

class SQLiteD1 {
  constructor(sqlite) {
    this.sqlite = sqlite;
  }

  prepare(sql) {
    return new SQLiteD1Statement(this.sqlite, sql);
  }

  async batch(statements) {
    this.sqlite.exec("BEGIN IMMEDIATE");
    try {
      const results = [];
      for (const statement of statements) {
        results.push(await statement.run());
      }
      this.sqlite.exec("COMMIT");
      return results;
    } catch (error) {
      this.sqlite.exec("ROLLBACK");
      throw error;
    }
  }
}

async function createDatabase() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");

  const migrationDirectory = new URL("../drizzle/", import.meta.url);
  const migrationFiles = (await readdir(migrationDirectory))
    .filter((name) => /^\d+.*\.sql$/.test(name))
    .sort();

  for (const file of migrationFiles) {
    const sql = await readFile(new URL(file, migrationDirectory), "utf8");
    for (const statement of sql
      .split("--> statement-breakpoint")
      .map((value) => value.trim())
      .filter(Boolean)) {
      sqlite.exec(statement);
    }
  }

  return { database: new SQLiteD1(sqlite), sqlite };
}

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("deployment-workflows", `${process.pid}`);
  return (await import(workerUrl.href)).default;
}

function authHeaders(email) {
  return {
    "oai-authenticated-user-email": email,
    "oai-authenticated-user-full-name": encodeURIComponent(
      email === ADMIN_EMAIL ? "GLI E2E Admin" : "GLI E2E Member",
    ),
    "oai-authenticated-user-full-name-encoding": "percent-encoded-utf-8",
  };
}

async function dispatch(worker, database, pathname, options = {}) {
  const method = options.method ?? "GET";
  const headers = new Headers(options.headers);
  headers.set(
    "accept",
    options.accept ?? (pathname.startsWith("/api/") ? "application/json" : "text/html"),
  );
  if (options.email) {
    for (const [name, value] of Object.entries(authHeaders(options.email))) {
      headers.set(name, value);
    }
  }
  if (options.body !== undefined) {
    headers.set("content-type", "application/json");
    headers.set("origin", APP_ORIGIN);
  }
  if (options.requestId) {
    headers.set("x-request-id", options.requestId);
  }

  Object.assign(cloudflareEnv, {
    DB: database,
    DATA_MODE: "d1",
    DEPLOYMENT_STAGE: "production",
    DEMO_AUTH_ENABLED: "false",
    DEMO_ADMIN_ENABLED: "false",
    LLM_PROVIDER: "disabled",
  });

  return worker.fetch(
    new Request(`${APP_ORIGIN}${pathname}`, {
      method,
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
      DB: database,
      DATA_MODE: "d1",
      DEPLOYMENT_STAGE: "production",
      DEMO_AUTH_ENABLED: "false",
      DEMO_ADMIN_ENABLED: "false",
      LLM_PROVIDER: "disabled",
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("built worker completes the member discovery and cash membership journey", async () => {
  const worker = await loadWorker();
  const { database, sqlite } = await createDatabase();

  try {
    const anonymous = await dispatch(worker, database, "/api/me");
    assert.equal(anonymous.status, 401);
    assert.match(anonymous.headers.get("cache-control") ?? "", /no-store/);

    const initialDashboardResponse = await dispatch(
      worker,
      database,
      "/api/me",
      { email: MEMBER_EMAIL },
    );
    assert.equal(initialDashboardResponse.status, 200);
    const initialDashboard = await initialDashboardResponse.json();
    assert.equal(initialDashboard.user.email, MEMBER_EMAIL);
    assert.deepEqual(initialDashboard.favorites, []);
    assert.deepEqual(initialDashboard.consultations, []);
    assert.equal(initialDashboard.activeMembership, null);

    const favoriteResponse = await dispatch(
      worker,
      database,
      "/api/favorites",
      {
        method: "POST",
        email: MEMBER_EMAIL,
        requestId: "e2e.favorite",
        body: { assetId: "GLI-KH-004" },
      },
    );
    assert.equal(favoriteResponse.status, 201);
    assert.deepEqual(await favoriteResponse.json(), {
      created: true,
      listingPublicId: "GLI-KH-004",
    });

    const duplicateFavoriteResponse = await dispatch(
      worker,
      database,
      "/api/favorites",
      {
        method: "POST",
        email: MEMBER_EMAIL,
        requestId: "e2e.favorite.repeat",
        body: { assetId: "GLI-KH-004" },
      },
    );
    assert.equal(duplicateFavoriteResponse.status, 200);
    assert.equal((await duplicateFavoriteResponse.json()).created, false);

    const consultationResponse = await dispatch(
      worker,
      database,
      "/api/consultations",
      {
        method: "POST",
        email: MEMBER_EMAIL,
        requestId: "e2e.consultation",
        body: {
          assetId: "GLI-KH-004",
          requestText:
            "Please verify rental demand, management fees, and title documents.",
        },
      },
    );
    assert.equal(consultationResponse.status, 201);
    const consultation = await consultationResponse.json();
    assert.equal(consultation.listingPublicId, "GLI-KH-004");
    assert.equal(consultation.status, "RECEIVED");

    const checkoutResponse = await dispatch(
      worker,
      database,
      "/api/memberships/checkout",
      {
        method: "POST",
        email: MEMBER_EMAIL,
        requestId: "e2e.checkout",
        body: { planId: "investor" },
      },
    );
    assert.equal(checkoutResponse.status, 201);
    const checkoutPayload = await checkoutResponse.json();
    assert.equal(checkoutPayload.checkout.planId, "investor");
    assert.equal(checkoutPayload.checkout.status, "PENDING");
    assert.equal(checkoutPayload.checkout.provider, "DEMO_CASH");
    assert.match(
      checkoutPayload.checkoutUrl,
      /^\/membership\/checkout\?id=chk_/,
    );

    const confirmResponse = await dispatch(
      worker,
      database,
      "/api/memberships/checkout/confirm",
      {
        method: "POST",
        email: MEMBER_EMAIL,
        requestId: "e2e.checkout.confirm",
        body: { checkoutId: checkoutPayload.checkout.id },
      },
    );
    assert.equal(confirmResponse.status, 200);
    const confirmation = await confirmResponse.json();
    assert.equal(confirmation.charged, false);
    assert.equal(confirmation.checkout.status, "COMPLETED");
    assert.equal(confirmation.membership.planId, "investor");
    assert.equal(confirmation.membership.status, "ACTIVE");

    const finalDashboardResponse = await dispatch(
      worker,
      database,
      "/api/me",
      { email: MEMBER_EMAIL },
    );
    assert.equal(finalDashboardResponse.status, 200);
    const finalDashboard = await finalDashboardResponse.json();
    assert.equal(finalDashboard.favorites.length, 1);
    assert.equal(finalDashboard.favorites[0].publicId, "GLI-KH-004");
    assert.equal(finalDashboard.consultations.length, 1);
    assert.equal(finalDashboard.consultations[0].status, "RECEIVED");
    assert.equal(finalDashboard.activeMembership.planId, "investor");

    const myPageResponse = await dispatch(worker, database, "/my", {
      email: MEMBER_EMAIL,
    });
    assert.equal(myPageResponse.status, 200);
    const myPageHtml = await myPageResponse.text();
    assert.match(myPageHtml, /GLI-KH-004/);
    assert.match(myPageHtml, /Investor/);

    const auditActions = sqlite
      .prepare(
        `SELECT action
         FROM audit_logs
         WHERE request_id LIKE 'e2e.%'
         ORDER BY id ASC`,
      )
      .all()
      .map((row) => row.action);
    assert.deepEqual(auditActions, [
      "FAVORITE_ADDED",
      "CONSULTATION_CREATED",
      "CASH_CHECKOUT_CREATED",
      "DEMO_CASH_MEMBERSHIP_ACTIVATED",
      "CASH_CHECKOUT_COMPLETED",
    ]);
  } finally {
    sqlite.close();
  }
});

test("built worker enforces admin boundaries and records release evidence", async () => {
  const worker = await loadWorker();
  const { database, sqlite } = await createDatabase();

  try {
    const memberExport = await dispatch(
      worker,
      database,
      "/api/admin/audit/export",
      { email: ADMIN_EMAIL },
    );
    assert.equal(memberExport.status, 403);
    assert.equal((await memberExport.json()).code, "ADMIN_REQUIRED");

    sqlite
      .prepare("UPDATE users SET role = 'ADMIN' WHERE email = ?")
      .run(ADMIN_EMAIL);

    const now = Date.now();
    const backupResponse = await dispatch(
      worker,
      database,
      "/api/admin/readiness/backups",
      {
        method: "POST",
        email: ADMIN_EMAIL,
        requestId: "e2e.backup",
        body: {
          environment: "STAGING",
          storageProvider: "R2",
          objectKey: "backups/e2e/staging.sqlite",
          manifestSha256: "a".repeat(64),
          capturedAt: now - 60_000,
          restoreTestedAt: now - 30_000,
          restoreResult: "SUCCEEDED",
          notes: "Automated deployment workflow verification.",
        },
      },
    );
    assert.equal(backupResponse.status, 200);
    const backup = (await backupResponse.json()).result;
    assert.equal(backup.environment, "STAGING");
    assert.equal(backup.restoreResult, "SUCCEEDED");
    assert.equal(backup.recordCounts.listings, 8);

    const auditExport = await dispatch(
      worker,
      database,
      "/api/admin/audit/export?category=OPERATIONS",
      { email: ADMIN_EMAIL },
    );
    assert.equal(auditExport.status, 200);
    assert.match(
      auditExport.headers.get("content-disposition") ?? "",
      /^attachment; filename="gli-audit-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
    assert.match(auditExport.headers.get("content-type") ?? "", /^text\/csv/);
    const csv = await auditExport.text();
    assert.match(csv, /BACKUP_EVIDENCE_RECORDED/);
    assert.doesNotMatch(csv, /authorization|api.?key|private.?key/i);

    const readinessPage = await dispatch(
      worker,
      database,
      "/admin/readiness",
      { email: ADMIN_EMAIL },
    );
    assert.equal(readinessPage.status, 200);
    const readinessHtml = await readinessPage.text();
    assert.match(readinessHtml, /PILOT READINESS/);
    assert.match(readinessHtml, /AUTOMATED EVIDENCE/);
    assert.match(readinessHtml, /BACKUP &amp; RESTORE/);

    const evidenceAudit = sqlite
      .prepare(
        `SELECT action, request_id AS requestId
         FROM audit_logs
         WHERE action = 'BACKUP_EVIDENCE_RECORDED'`,
      )
      .get();
    assert.equal(evidenceAudit.action, "BACKUP_EVIDENCE_RECORDED");
    assert.equal(evidenceAudit.requestId, "e2e.backup");
  } finally {
    sqlite.close();
  }
});

