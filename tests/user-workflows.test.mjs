import assert from "node:assert/strict";
import test from "node:test";

import {
  activateDemoCashMembership,
  addFavorite,
  createConsultation,
  createStableUserId,
  ensureUser,
  getUserDashboard,
  normalizeEmail,
  removeFavorite,
} from "../db/user-workflows.ts";

const NOW = Date.parse("2026-07-30T00:00:00.000Z");
const UUIDS = {
  consultation: "11111111-1111-4111-8111-111111111111",
  membership: "22222222-2222-4222-8222-222222222222",
};

class FakeD1 {
  constructor() {
    this.users = [];
    this.listings = [
      {
        id: 1,
        publicId: "GLI-KH-001",
        title: "BKK1 river residence",
        status: "ACTIVE",
        country: "Cambodia",
        city: "Phnom Penh",
        district: "BKK1",
        transactionType: "rent",
        propertyType: "condo",
        summary: "Verified test listing",
        priceMinor: 50000,
        currency: "USD",
        imageUrl: "https://example.test/one.jpg",
        trustScore: 81,
        trustStatus: "REVIEWING",
      },
      {
        id: 2,
        publicId: "GLI-KH-ARCHIVED",
        title: "Archived listing",
        status: "ARCHIVED",
      },
    ];
    this.favorites = [];
    this.consultations = [];
    this.memberships = [];
    this.auditLogs = [];
    this.statements = [];
  }

  prepare(sql) {
    const statement = new FakeStatement(this, sql);
    this.statements.push(statement);
    return statement;
  }

  async batch(statements) {
    const results = [];
    for (const statement of statements) {
      results.push(await statement.run());
    }
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
    const rows = this.#read();
    return rows[0] ?? null;
  }

  async all() {
    return { success: true, results: this.#read() };
  }

  async run() {
    const db = this.database;
    const sql = this.sql;
    const v = this.values;

    if (sql.startsWith("INSERT INTO users")) {
      db.users.push({
        id: v[0],
        email: v[1],
        displayName: v[2],
        role: "MEMBER",
        status: "ACTIVE",
        createdAt: v[3],
        updatedAt: v[4],
      });
    } else if (sql.startsWith("UPDATE users")) {
      const user = db.users.find((row) => row.id === v[3]);
      user.email = v[0];
      user.displayName = v[1];
      user.updatedAt = v[2];
    } else if (sql.startsWith("INSERT OR IGNORE INTO favorites")) {
      const exists = db.favorites.some(
        (row) => row.userId === v[0] && row.listingId === v[1],
      );
      if (!exists) {
        db.favorites.push({
          userId: v[0],
          listingId: v[1],
          createdAt: v[2],
        });
      }
    } else if (sql.startsWith("DELETE FROM favorites")) {
      db.favorites = db.favorites.filter(
        (row) => !(row.userId === v[0] && row.listingId === v[1]),
      );
    } else if (sql.startsWith("INSERT INTO consultations")) {
      db.consultations.push({
        id: v[0],
        userId: v[1],
        listingId: v[2],
        requestText: v[3],
        preferredAt: v[4],
        status: "RECEIVED",
        createdAt: v[5],
        updatedAt: v[6],
      });
    } else if (sql.startsWith("UPDATE memberships")) {
      for (const membership of db.memberships) {
        if (
          membership.userId === v[1] &&
          membership.provider === "DEMO_CASH" &&
          membership.status === "ACTIVE"
        ) {
          membership.status = "REPLACED";
          membership.updatedAt = v[0];
        }
      }
    } else if (sql.startsWith("INSERT INTO memberships")) {
      db.memberships.push({
        id: v[0],
        userId: v[1],
        planId: v[2],
        provider: "DEMO_CASH",
        providerCustomerId: null,
        providerSubscriptionId: null,
        status: "ACTIVE",
        periodStart: v[3],
        periodEnd: v[4],
        createdAt: v[5],
        updatedAt: v[6],
      });
    } else if (sql.startsWith("INSERT INTO audit_logs")) {
      db.auditLogs.push({
        actorUserId: v[0],
        action: v[1],
        resourceType: v[2],
        resourceId: v[3],
        beforeJson: v[4],
        afterJson: v[5],
        requestId: v[6],
        createdAt: v[7],
      });
    } else {
      throw new Error(`Unhandled write SQL: ${sql}`);
    }

    return { success: true, meta: { changes: 1 } };
  }

  #read() {
    const db = this.database;
    const sql = this.sql;
    const v = this.values;

    if (sql.includes("FROM users") && sql.includes("WHERE id = ?")) {
      return db.users.filter((row) => row.id === v[0]).map((row) => ({ ...row }));
    }
    if (sql.includes("FROM listings") && sql.includes("WHERE public_id = ?")) {
      return db.listings
        .filter((row) => row.publicId === v[0])
        .map(({ id, publicId, title, status }) => ({
          id,
          publicId,
          title,
          status,
        }));
    }
    if (sql.includes("FROM favorites") && sql.includes("listing_id = ?")) {
      return db.favorites
        .filter((row) => row.userId === v[0] && row.listingId === v[1])
        .map((row) => ({ userId: row.userId }));
    }
    if (sql.includes("FROM favorites f")) {
      return db.favorites
        .filter((favorite) => favorite.userId === v[0])
        .map((favorite) => {
          const listing = db.listings.find(
            (candidate) =>
              candidate.id === favorite.listingId &&
              candidate.status === "ACTIVE",
          );
          if (!listing) return null;
          return {
            publicId: listing.publicId,
            country: listing.country,
            city: listing.city,
            district: listing.district ?? null,
            transactionType: listing.transactionType,
            propertyType: listing.propertyType,
            title: listing.title,
            summary: listing.summary,
            priceMinor: listing.priceMinor,
            currency: listing.currency,
            imageUrl: listing.imageUrl ?? null,
            trustScore: listing.trustScore ?? 0,
            trustStatus: listing.trustStatus ?? "PRELIMINARY",
            favoritedAt: favorite.createdAt,
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.favoritedAt - a.favoritedAt);
    }
    if (sql.includes("FROM consultations c")) {
      return db.consultations
        .filter((row) => row.userId === v[0])
        .map((row) => {
          const listing = db.listings.find(
            (candidate) => candidate.id === row.listingId,
          );
          return {
            id: row.id,
            listingPublicId: listing?.publicId ?? null,
            listingTitle: listing?.title ?? null,
            requestText: row.requestText,
            preferredAt: row.preferredAt,
            status: row.status,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          };
        })
        .sort((a, b) => b.createdAt - a.createdAt);
    }
    if (sql.includes("FROM memberships")) {
      return db.memberships
        .filter(
          (row) =>
            row.userId === v[0] &&
            row.status === "ACTIVE" &&
            row.periodEnd > v[1],
        )
        .sort((a, b) => b.periodEnd - a.periodEnd)
        .slice(0, 1)
        .map((row) => ({
          id: row.id,
          planId: row.planId,
          provider: row.provider,
          status: row.status,
          periodStart: row.periodStart,
          periodEnd: row.periodEnd,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }));
    }

    throw new Error(`Unhandled read SQL: ${sql}`);
  }
}

async function createUser(database, overrides = {}) {
  return ensureUser(
    database,
    {
      email: " Investor@Example.COM ",
      displayName: " GLI Investor ",
      ...overrides,
    },
    { now: () => NOW, requestId: "req-user-1" },
  );
}

test("normalizes email and derives a deterministic SHA-256 user id", async () => {
  assert.equal(normalizeEmail(" Investor@Example.COM "), "investor@example.com");
  const first = await createStableUserId("Investor@example.com");
  const second = await createStableUserId(" investor@EXAMPLE.com ");

  assert.equal(first, second);
  assert.match(first, /^usr_[0-9a-f]{64}$/);
  assert.throws(() => normalizeEmail("not-an-email"), /valid email/);
});

test("ensures a normalized user and audits only actual profile changes", async () => {
  const database = new FakeD1();
  const user = await createUser(database);

  assert.equal(user.email, "investor@example.com");
  assert.equal(user.displayName, "GLI Investor");
  assert.equal(database.users.length, 1);
  assert.equal(database.auditLogs[0].action, "USER_CREATED");
  assert.equal(database.auditLogs[0].requestId, "req-user-1");

  const unchanged = await ensureUser(
    database,
    { email: "INVESTOR@example.com" },
    { now: () => NOW + 1 },
  );
  assert.equal(unchanged.displayName, "GLI Investor");
  assert.equal(database.auditLogs.length, 1);

  const updated = await ensureUser(
    database,
    { email: "investor@example.com", displayName: "Updated Investor" },
    { now: () => NOW + 2 },
  );
  assert.equal(updated.displayName, "Updated Investor");
  assert.equal(database.auditLogs.at(-1).action, "USER_UPDATED");
});

test("adds and removes an ACTIVE listing favorite idempotently with audit logs", async () => {
  const database = new FakeD1();
  const user = await createUser(database);

  const added = await addFavorite(
    database,
    { userId: user.id, listingPublicId: "GLI-KH-001" },
    { now: () => NOW + 10 },
  );
  const duplicate = await addFavorite(
    database,
    { userId: user.id, listingPublicId: "GLI-KH-001" },
    { now: () => NOW + 11 },
  );

  assert.deepEqual(added, {
    created: true,
    listingPublicId: "GLI-KH-001",
  });
  assert.equal(duplicate.created, false);
  assert.equal(database.favorites.length, 1);
  assert.equal(
    database.auditLogs.filter((row) => row.action === "FAVORITE_ADDED").length,
    1,
  );

  await assert.rejects(
    addFavorite(database, {
      userId: user.id,
      listingPublicId: "GLI-KH-ARCHIVED",
    }),
    /not active/,
  );
  await assert.rejects(
    addFavorite(database, {
      userId: user.id,
      listingPublicId: "GLI-KH-MISSING",
    }),
    /not found/,
  );

  const removed = await removeFavorite(
    database,
    { userId: user.id, listingPublicId: "GLI-KH-001" },
    { now: () => NOW + 12 },
  );
  const alreadyRemoved = await removeFavorite(database, {
    userId: user.id,
    listingPublicId: "GLI-KH-001",
  });

  assert.equal(removed.removed, true);
  assert.equal(alreadyRemoved.removed, false);
  assert.equal(database.favorites.length, 0);
  assert.equal(database.auditLogs.at(-1).action, "FAVORITE_REMOVED");
});

test("creates listing and general consultations after validating input", async () => {
  const database = new FakeD1();
  const user = await createUser(database);
  const preferredAt = NOW + 86_400_000;

  const consultation = await createConsultation(
    database,
    {
      userId: user.id,
      listingPublicId: "GLI-KH-001",
      requestText: "  현지 실사 상담을 요청합니다.  ",
      preferredAt,
      requestId: "req-consult-1",
    },
    {
      now: () => NOW + 20,
      randomUUID: () => UUIDS.consultation,
    },
  );

  assert.deepEqual(consultation, {
    id: `con_${UUIDS.consultation}`,
    listingPublicId: "GLI-KH-001",
    listingTitle: "BKK1 river residence",
    requestText: "현지 실사 상담을 요청합니다.",
    preferredAt,
    status: "RECEIVED",
    createdAt: NOW + 20,
    updatedAt: NOW + 20,
  });
  assert.equal(database.auditLogs.at(-1).action, "CONSULTATION_CREATED");
  assert.equal(database.auditLogs.at(-1).requestId, "req-consult-1");

  await assert.rejects(
    createConsultation(database, {
      userId: user.id,
      requestText: "짧음",
    }),
    /between 5 and 2000/,
  );
});

test("activates a non-charging 30-day DEMO_CASH membership and replaces the prior demo", async () => {
  const database = new FakeD1();
  const user = await createUser(database);
  database.memberships.push({
    id: "mem_old",
    userId: user.id,
    planId: "explore",
    provider: "DEMO_CASH",
    status: "ACTIVE",
    periodStart: NOW - 100,
    periodEnd: NOW + 100,
    createdAt: NOW - 100,
    updatedAt: NOW - 100,
  });

  const membership = await activateDemoCashMembership(
    database,
    { userId: user.id, planId: " Investor " },
    {
      now: () => NOW,
      randomUUID: () => UUIDS.membership,
      requestId: "req-membership-1",
    },
  );

  assert.equal(database.memberships[0].status, "REPLACED");
  assert.equal(membership.provider, "DEMO_CASH");
  assert.equal(membership.status, "ACTIVE");
  assert.equal(membership.planId, "investor");
  assert.equal(membership.periodEnd - membership.periodStart, 30 * 86_400_000);
  assert.equal(membership.demo, true);
  assert.equal(membership.charged, false);
  assert.equal(database.memberships[1].providerCustomerId, null);
  assert.equal(database.memberships[1].providerSubscriptionId, null);
  assert.equal(
    database.auditLogs.at(-1).action,
    "DEMO_CASH_MEMBERSHIP_ACTIVATED",
  );
  assert.match(database.auditLogs.at(-1).afterJson, /"charged":false/);

  await assert.rejects(
    activateDemoCashMembership(database, {
      userId: user.id,
      planId: "enterprise",
    }),
    /explore, investor, private/,
  );
});

test("returns favorites, consultations, and the current active membership dashboard", async () => {
  const database = new FakeD1();
  const user = await createUser(database);
  await addFavorite(
    database,
    { userId: user.id, listingPublicId: "GLI-KH-001" },
    { now: () => NOW + 10 },
  );
  await createConsultation(
    database,
    {
      userId: user.id,
      listingPublicId: "GLI-KH-001",
      requestText: "계약 추진 절차를 상담하고 싶습니다.",
    },
    {
      now: () => NOW + 20,
      randomUUID: () => UUIDS.consultation,
    },
  );
  await activateDemoCashMembership(
    database,
    { userId: user.id, planId: "private" },
    {
      now: () => NOW + 30,
      randomUUID: () => UUIDS.membership,
    },
  );

  const dashboard = await getUserDashboard(database, user.id, {
    now: () => NOW + 40,
  });

  assert.equal(dashboard.user.id, user.id);
  assert.equal(dashboard.favorites.length, 1);
  assert.equal(dashboard.favorites[0].publicId, "GLI-KH-001");
  assert.equal(dashboard.favorites[0].trustScore, 81);
  assert.equal(dashboard.consultations.length, 1);
  assert.equal(dashboard.consultations[0].status, "RECEIVED");
  assert.equal(dashboard.activeMembership.planId, "private");
  assert.equal(dashboard.activeMembership.provider, "DEMO_CASH");
});
