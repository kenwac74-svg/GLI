import assert from "node:assert/strict";
import test from "node:test";

import {
  completeDemoCashCheckout,
  createCashCheckout,
  getCashCheckout,
} from "../db/membership-billing.ts";

const NOW = Date.parse("2026-07-31T00:00:00.000Z");
const USER_ID = "usr_member";
const CHECKOUT_UUID = "11111111-1111-4111-8111-111111111111";
const MEMBERSHIP_UUID = "22222222-2222-4222-8222-222222222222";

class FakeD1 {
  constructor() {
    this.users = [{ id: USER_ID, status: "ACTIVE" }];
    this.checkouts = [];
    this.memberships = [];
    this.auditLogs = [];
  }

  prepare(sql) {
    return new FakeStatement(this, sql);
  }

  async batch(statements) {
    const results = [];
    for (const statement of statements) results.push(await statement.run());
    return results;
  }
}

class FakeStatement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql.replace(/\s+/g, " ").trim();
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async first() {
    const sql = this.sql;
    const v = this.values;
    if (sql.includes("FROM users WHERE id = ?")) {
      return this.database.users.find((row) => row.id === v[0]) ?? null;
    }
    if (sql.includes("FROM cash_checkout_sessions")) {
      return (
        this.database.checkouts.find(
          (row) => row.id === v[0] && row.userId === v[1],
        ) ?? null
      );
    }
    if (sql.includes("FROM memberships")) {
      return (
        this.database.memberships.find(
          (row) => row.id === v[0] && row.userId === v[1],
        ) ?? null
      );
    }
    throw new Error(`Unhandled read SQL: ${sql}`);
  }

  async all() {
    return { success: true, results: [] };
  }

  async run() {
    const db = this.database;
    const sql = this.sql;
    const v = this.values;

    if (
      sql.startsWith("UPDATE cash_checkout_sessions") &&
      sql.includes("status = 'CANCELLED'")
    ) {
      for (const row of db.checkouts) {
        if (row.userId === v[1] && row.status === "PENDING") {
          row.status = "CANCELLED";
          row.updatedAt = v[0];
        }
      }
    } else if (sql.startsWith("INSERT INTO cash_checkout_sessions")) {
      db.checkouts.push({
        id: v[0],
        userId: v[1],
        planId: v[2],
        amountMinor: v[3],
        currency: v[4],
        provider: "DEMO_CASH",
        status: "PENDING",
        membershipId: null,
        expiresAt: v[5],
        completedAt: null,
        createdAt: v[6],
        updatedAt: v[7],
      });
    } else if (
      sql.startsWith("UPDATE cash_checkout_sessions") &&
      sql.includes("status = 'EXPIRED'")
    ) {
      const row = db.checkouts.find(
        (candidate) =>
          candidate.id === v[1] &&
          candidate.userId === v[2] &&
          candidate.status === "PENDING",
      );
      if (row) {
        row.status = "EXPIRED";
        row.updatedAt = v[0];
      }
    } else if (
      sql.startsWith("UPDATE cash_checkout_sessions") &&
      sql.includes("status = 'COMPLETED'")
    ) {
      const row = db.checkouts.find(
        (candidate) =>
          candidate.id === v[3] &&
          candidate.userId === v[4] &&
          candidate.status === "PENDING",
      );
      if (row) {
        row.status = "COMPLETED";
        row.membershipId = v[0];
        row.completedAt = v[1];
        row.updatedAt = v[2];
      }
    } else if (sql.startsWith("UPDATE memberships")) {
      for (const row of db.memberships) {
        if (
          row.userId === v[1] &&
          row.provider === "DEMO_CASH" &&
          row.status === "ACTIVE"
        ) {
          row.status = "REPLACED";
          row.updatedAt = v[0];
        }
      }
    } else if (sql.startsWith("INSERT INTO memberships")) {
      db.memberships.push({
        id: v[0],
        userId: v[1],
        planId: v[2],
        provider: "DEMO_CASH",
        status: "ACTIVE",
        periodStart: v[3],
        periodEnd: v[4],
        createdAt: v[5],
        updatedAt: v[6],
      });
    } else if (sql.startsWith("INSERT INTO audit_logs")) {
      if (sql.includes("'CASH_CHECKOUT'")) {
        db.auditLogs.push({
          actorUserId: v[0],
          action: v[1],
          resourceType: "CASH_CHECKOUT",
          resourceId: v[2],
          afterJson: v[3],
          requestId: v[4],
          createdAt: v[5],
        });
      } else {
        db.auditLogs.push({
          actorUserId: v[0],
          action: v[1],
          resourceType: v[2],
          resourceId: v[3],
          afterJson: v[5],
          requestId: v[6],
          createdAt: v[7],
        });
      }
    } else {
      throw new Error(`Unhandled write SQL: ${sql}`);
    }
    return { success: true, meta: { changes: 1 } };
  }
}

test("creates a priced checkout and cancels a prior pending session", async () => {
  const database = new FakeD1();
  database.checkouts.push({
    id: "chk_old",
    userId: USER_ID,
    status: "PENDING",
    updatedAt: NOW - 1,
  });

  const checkout = await createCashCheckout(
    database,
    { userId: USER_ID, planId: " Investor ", requestId: "req_checkout" },
    { now: () => NOW, randomUUID: () => CHECKOUT_UUID },
  );

  assert.equal(database.checkouts[0].status, "CANCELLED");
  assert.equal(checkout.id, `chk_${CHECKOUT_UUID}`);
  assert.equal(checkout.planId, "investor");
  assert.equal(checkout.amountMinor, 59_000);
  assert.equal(checkout.currency, "KRW");
  assert.equal(checkout.status, "PENDING");
  assert.equal(checkout.expiresAt - checkout.createdAt, 30 * 60 * 1000);
  assert.equal(database.auditLogs.at(-1).action, "CASH_CHECKOUT_CREATED");
});

test("completes a checkout into a 30-day membership without a charge", async () => {
  const database = new FakeD1();
  const checkout = await createCashCheckout(
    database,
    { userId: USER_ID, planId: "private" },
    { now: () => NOW, randomUUID: () => CHECKOUT_UUID },
  );

  const result = await completeDemoCashCheckout(
    database,
    { checkoutId: checkout.id, userId: USER_ID },
    { now: () => NOW + 1_000, randomUUID: () => MEMBERSHIP_UUID },
  );

  assert.equal(result.charged, false);
  assert.equal(result.checkout.status, "COMPLETED");
  assert.equal(result.membership.planId, "private");
  assert.equal(result.membership.periodEnd - result.membership.periodStart, 30 * 86_400_000);
  assert.equal(database.checkouts[0].membershipId, result.membership.id);
  assert.equal(database.auditLogs.at(-1).action, "CASH_CHECKOUT_COMPLETED");

  const repeated = await completeDemoCashCheckout(database, {
    checkoutId: checkout.id,
    userId: USER_ID,
  });
  assert.equal(repeated.membership.id, result.membership.id);
  assert.equal(database.memberships.length, 1);
});

test("expires an old checkout and prevents activation", async () => {
  const database = new FakeD1();
  const checkout = await createCashCheckout(
    database,
    { userId: USER_ID, planId: "explore" },
    { now: () => NOW, randomUUID: () => CHECKOUT_UUID },
  );

  await assert.rejects(
    completeDemoCashCheckout(
      database,
      { checkoutId: checkout.id, userId: USER_ID },
      { now: () => checkout.expiresAt + 1, randomUUID: () => MEMBERSHIP_UUID },
    ),
    /expired/,
  );
  assert.equal(database.checkouts[0].status, "EXPIRED");
  assert.equal(database.memberships.length, 0);
  assert.equal(
    await getCashCheckout(database, checkout.id, USER_ID).then(
      (session) => session?.status,
    ),
    "EXPIRED",
  );
});
