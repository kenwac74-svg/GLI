import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import { createProviderCashCheckout } from "../db/membership-billing.ts";
import {
  listRecentPaymentEvents,
  processPaymentWebhook,
} from "../db/payment-webhooks.ts";

const NOW = Date.parse("2026-07-31T03:00:00.000Z");
const USER_ID = "usr_payment_member";
const CHECKOUT_UUID = "33333333-3333-4333-8333-333333333333";
const MEMBERSHIP_UUID = "44444444-4444-4444-8444-444444444444";

async function createDatabase() {
  const sqlite = new DatabaseSync(":memory:");
  for (const file of [
    "drizzle/0000_elite_adam_destine.sql",
    "drizzle/0001_seed_approved_fixture.sql",
    "drizzle/0002_admin_ingestion_pipeline.sql",
    "drizzle/0003_cash_checkout_sessions.sql",
    "drizzle/0004_authorized_source_connectors.sql",
    "drizzle/0005_payment_webhook_ledger.sql",
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
       ) VALUES (?, ?, 'Payment Member', 'MEMBER', 'ACTIVE', ?, ?)`,
    )
    .run(USER_ID, "payment-member@example.com", NOW, NOW);

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

async function createCheckout(database) {
  return createProviderCashCheckout(
    database,
    { userId: USER_ID, planId: "investor", requestId: "req_provider_checkout" },
    {
      provider: "PAYMENT_TEST",
      async createSession(input) {
        assert.match(input.referenceId, /^chk_/);
        assert.equal(input.amountMinor, 4_500);
        return {
          providerSessionId: "provider-session-101",
          checkoutUrl: "https://checkout.payment.example/session/101",
          expiresAt: NOW + 30 * 60 * 1000,
        };
      },
    },
    { now: () => NOW, randomUUID: () => CHECKOUT_UUID },
  );
}

function verifier(event) {
  return {
    provider: "PAYMENT_TEST",
    async verify({ headers }) {
      if (headers["x-test-signature"] !== "valid") {
        throw new Error("Invalid webhook signature");
      }
      return event;
    },
  };
}

function completedEvent(overrides = {}) {
  return {
    providerEventId: "evt-completed-101",
    type: "CHECKOUT_COMPLETED",
    providerSessionId: "provider-session-101",
    occurredAt: NOW + 1_000,
    amountMinor: 4_500,
    currency: "KRW",
    providerCustomerId: "customer-101",
    providerSubscriptionId: "subscription-101",
    ...overrides,
  };
}

test("creates a provider session without exposing provider SDK details to membership code", async () => {
  const { database, sqlite } = await createDatabase();
  try {
    const result = await createCheckout(database);
    assert.equal(result.checkout.provider, "PAYMENT_TEST");
    assert.equal(result.checkout.providerSessionId, "provider-session-101");
    assert.equal(result.checkout.status, "PENDING");
    assert.equal(
      result.checkoutUrl,
      "https://checkout.payment.example/session/101",
    );

    const stored = sqlite
      .prepare(
        `SELECT provider, provider_session_id AS providerSessionId, status
         FROM cash_checkout_sessions WHERE id = ?`,
      )
      .get(result.checkout.id);
    assert.deepEqual({ ...stored }, {
      provider: "PAYMENT_TEST",
      providerSessionId: "provider-session-101",
      status: "PENDING",
    });
  } finally {
    sqlite.close();
  }
});

test("processes a signed completion once and activates one global cash membership", async () => {
  const { database, sqlite } = await createDatabase();
  try {
    const checkout = await createCheckout(database);
    const rawBody = new TextEncoder().encode('{"id":"evt-completed-101"}');
    const input = {
      rawBody,
      headers: { "x-test-signature": "valid" },
      verifier: verifier(completedEvent()),
      requestId: "req_webhook_complete",
    };
    const options = {
      now: () => NOW + 2_000,
      randomUUID: () => MEMBERSHIP_UUID,
    };

    const first = await processPaymentWebhook(database, input, options);
    assert.equal(first.checkoutId, checkout.checkout.id);
    assert.equal(first.checkoutStatus, "COMPLETED");
    assert.equal(first.duplicate, false);

    const repeated = await processPaymentWebhook(database, input, options);
    assert.equal(repeated.duplicate, true);
    assert.equal(repeated.membershipId, first.membershipId);
    assert.equal(
      sqlite.prepare("SELECT count(*) AS count FROM memberships").get().count,
      1,
    );

    const membership = sqlite
      .prepare(
        `SELECT provider, status, period_start AS periodStart,
                period_end AS periodEnd
         FROM memberships WHERE id = ?`,
      )
      .get(first.membershipId);
    assert.equal(membership.provider, "PAYMENT_TEST");
    assert.equal(membership.status, "ACTIVE");
    assert.equal(
      membership.periodEnd - membership.periodStart,
      30 * 86_400_000,
    );
    assert.equal(
      sqlite
        .prepare(
          "SELECT count(*) AS count FROM payment_webhook_events WHERE status = 'PROCESSED'",
        )
        .get().count,
      1,
    );
  } finally {
    sqlite.close();
  }
});

test("rejects amount tampering and retains a failed event for operations review", async () => {
  const { database, sqlite } = await createDatabase();
  try {
    await createCheckout(database);
    await assert.rejects(
      processPaymentWebhook(
        database,
        {
          rawBody: new TextEncoder().encode('{"id":"evt-amount-mismatch"}'),
          headers: { "x-test-signature": "valid" },
          verifier: verifier(
            completedEvent({
              providerEventId: "evt-amount-mismatch",
              amountMinor: 1,
            }),
          ),
        },
        {
          now: () => NOW + 2_000,
          randomUUID: () => MEMBERSHIP_UUID,
        },
      ),
      /amount does not match/,
    );

    assert.equal(
      sqlite.prepare("SELECT count(*) AS count FROM memberships").get().count,
      0,
    );
    const events = await listRecentPaymentEvents(database);
    assert.equal(events[0].status, "FAILED");
    assert.match(events[0].errorSummary, /amount does not match/);
  } finally {
    sqlite.close();
  }
});

test("processes a later refund by ending access and preserving the audit trail", async () => {
  const { database, sqlite } = await createDatabase();
  try {
    await createCheckout(database);
    const completion = await processPaymentWebhook(
      database,
      {
        rawBody: new TextEncoder().encode('{"id":"evt-completed-101"}'),
        headers: { "x-test-signature": "valid" },
        verifier: verifier(completedEvent()),
      },
      {
        now: () => NOW + 2_000,
        randomUUID: () => MEMBERSHIP_UUID,
      },
    );
    const refundedAt = NOW + 10_000;
    const refund = await processPaymentWebhook(
      database,
      {
        rawBody: new TextEncoder().encode('{"id":"evt-refund-101"}'),
        headers: { "x-test-signature": "valid" },
        verifier: verifier({
          providerEventId: "evt-refund-101",
          type: "PAYMENT_REFUNDED",
          providerSessionId: "provider-session-101",
          occurredAt: refundedAt,
          amountMinor: 4_500,
          currency: "KRW",
        }),
      },
      { now: () => refundedAt + 1_000 },
    );

    assert.equal(refund.checkoutStatus, "REFUNDED");
    const membership = sqlite
      .prepare(
        "SELECT status, period_end AS periodEnd FROM memberships WHERE id = ?",
      )
      .get(completion.membershipId);
    assert.equal(membership.status, "REFUNDED");
    assert.equal(membership.periodEnd, refundedAt);
    assert.deepEqual(
      sqlite
        .prepare(
          `SELECT action FROM audit_logs
           WHERE resource_id = ? ORDER BY id`,
        )
        .all(completion.membershipId)
        .map((row) => row.action),
      ["CASH_MEMBERSHIP_ACTIVATED", "CASH_MEMBERSHIP_REFUNDED"],
    );
  } finally {
    sqlite.close();
  }
});

test("does not persist an event when signature verification fails", async () => {
  const { database, sqlite } = await createDatabase();
  try {
    await createCheckout(database);
    await assert.rejects(
      processPaymentWebhook(
        database,
        {
          rawBody: new TextEncoder().encode('{"id":"evt-bad-signature"}'),
          headers: { "x-test-signature": "invalid" },
          verifier: verifier(completedEvent()),
        },
        { now: () => NOW + 2_000 },
      ),
      /Invalid webhook signature/,
    );
    assert.equal(
      sqlite
        .prepare("SELECT count(*) AS count FROM payment_webhook_events")
        .get().count,
      0,
    );
  } finally {
    sqlite.close();
  }
});
