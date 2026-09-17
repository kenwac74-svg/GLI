import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import {
  addMemberConsultationMessage,
  addOperatorConsultationMessage,
  getAdminConsultationThread,
  getMemberConsultationThread,
} from "../db/consultation-thread.ts";
import {
  getMemberNotificationFeed,
  markMemberNotificationRead,
} from "../db/member-notifications.ts";

const NOW = Date.parse("2026-07-31T08:00:00.000Z");

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
      meta: { changes: Number(result.changes) },
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

async function createFixture() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  const migrationDirectory = new URL("../drizzle/", import.meta.url);
  const migrationFiles = (await readdir(migrationDirectory))
    .filter(name => /^\d+.*\.sql$/.test(name))
    .sort();

  for (const file of migrationFiles) {
    const sql = await readFile(new URL(file, migrationDirectory), "utf8");
    for (const statement of sql
      .split("--> statement-breakpoint")
      .map(value => value.trim())
      .filter(Boolean)) {
      sqlite.exec(statement);
    }
  }

  const insertUser = sqlite.prepare(`
    INSERT INTO users (
      id, email, display_name, role, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)
  `);
  insertUser.run(
    "usr_member_a",
    "member-a@gli.example",
    "Member A",
    "MEMBER",
    NOW,
    NOW,
  );
  insertUser.run(
    "usr_member_b",
    "member-b@gli.example",
    "Member B",
    "MEMBER",
    NOW,
    NOW,
  );
  insertUser.run(
    "usr_admin",
    "admin@gli.example",
    "GLI Advisor",
    "ADMIN",
    NOW,
    NOW,
  );

  const listingId = Number(
    sqlite
      .prepare(`
        INSERT INTO listings (
          public_id, country, city, transaction_type, property_type,
          title, summary, price_minor, currency, status, is_gli_direct,
          first_seen_at, last_seen_at, created_at, updated_at
        ) VALUES (
          'GLI-KH-THREAD', 'KH', 'Phnom Penh', 'SALE', 'CONDO',
          'BKK1 rental residence', 'Consultation fixture', 13500000, 'USD',
          'ACTIVE', 1, ?, ?, ?, ?
        )
      `)
      .run(NOW, NOW, NOW, NOW).lastInsertRowid,
  );

  const insertConsultation = sqlite.prepare(`
    INSERT INTO consultations (
      id, user_id, listing_id, request_text, preferred_at,
      assignee_user_id, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?)
  `);
  insertConsultation.run(
    "con_member_a",
    "usr_member_a",
    listingId,
    "Please verify the likely monthly rent.",
    "usr_admin",
    "RECEIVED",
    NOW,
    NOW,
  );
  insertConsultation.run(
    "con_member_b",
    "usr_member_b",
    listingId,
    "Please review the title documents.",
    null,
    "COMPLETED",
    NOW,
    NOW,
  );

  return { database: new SQLiteD1(sqlite), sqlite };
}

test("members can load only their own consultation thread", async () => {
  const { database } = await createFixture();

  const ownThread = await getMemberConsultationThread(database, {
    consultationId: "con_member_a",
    memberUserId: "usr_member_a",
  });
  const otherMemberThread = await getMemberConsultationThread(database, {
    consultationId: "con_member_a",
    memberUserId: "usr_member_b",
  });

  assert.equal(ownThread?.listingPublicId, "GLI-KH-THREAD");
  assert.equal(ownThread?.requestText, "Please verify the likely monthly rent.");
  assert.deepEqual(ownThread?.events, []);
  assert.equal(otherMemberThread, null);
});

test("member and operator messages form an ordered, member-visible thread", async () => {
  const { database, sqlite } = await createFixture();

  const memberEvent = await addMemberConsultationMessage(
    database,
    {
      consultationId: "con_member_a",
      memberUserId: "usr_member_a",
      body: " Please also confirm the building management fee. ",
    },
    {
      now: () => NOW + 100,
      randomUUID: () => "11111111-1111-4111-8111-111111111111",
      requestId: "req-member-message",
    },
  );
  const operatorEvent = await addOperatorConsultationMessage(
    database,
    {
      consultationId: "con_member_a",
      actorUserId: "usr_admin",
      body: "The local partner is checking the latest invoice.",
    },
    {
      now: () => NOW + 200,
      randomUUID: () => "22222222-2222-4222-8222-222222222222",
      requestId: "req-operator-message",
    },
  );

  assert.equal(memberEvent.eventType, "MEMBER_MESSAGE");
  assert.equal(operatorEvent.eventType, "OPERATOR_MESSAGE");

  const thread = await getMemberConsultationThread(database, {
    consultationId: "con_member_a",
    memberUserId: "usr_member_a",
  });
  assert.deepEqual(
    thread?.events.map(event => [event.eventType, event.body]),
    [
      [
        "MEMBER_MESSAGE",
        "Please also confirm the building management fee.",
      ],
      [
        "OPERATOR_MESSAGE",
        "The local partner is checking the latest invoice.",
      ],
    ],
  );
  assert.equal(thread?.updatedAt, NOW + 200);

  const audits = sqlite
    .prepare(`
      SELECT action, after_json AS afterJson
      FROM audit_logs
      ORDER BY id ASC
    `)
    .all();
  assert.equal(audits.length, 2);
  assert.equal(audits[0].action, "CONSULTATION_MESSAGE_ADDED");
  assert.equal(JSON.parse(audits[0].afterJson).bodyLength, 48);
  assert.doesNotMatch(
    audits[0].afterJson,
    /building management fee/,
  );

  const notifications = sqlite
    .prepare(`
      SELECT user_id AS userId, kind, href, event_key AS eventKey, read_at AS readAt
      FROM member_notifications
    `)
    .all()
    .map((row) => ({ ...row }));
  assert.deepEqual(notifications, [
    {
      userId: "usr_member_a",
      kind: "CONSULTATION_REPLY",
      href: "/my/consultations/con_member_a",
      eventKey: operatorEvent.id,
      readAt: null,
    },
  ]);
});

test("closed consultations reject member follow-up and require admin operators", async () => {
  const { database } = await createFixture();

  await assert.rejects(
    addMemberConsultationMessage(database, {
      consultationId: "con_member_b",
      memberUserId: "usr_member_b",
      body: "Can I reopen this case?",
    }),
    /Closed consultations cannot receive messages/,
  );
  await assert.rejects(
    getAdminConsultationThread(database, {
      consultationId: "con_member_a",
      actorUserId: "usr_member_a",
    }),
    /Actor must be an active ADMIN user/,
  );
});

test("member alerts are owner-scoped and become read idempotently", async () => {
  const { database, sqlite } = await createFixture();
  await addOperatorConsultationMessage(
    database,
    {
      consultationId: "con_member_a",
      actorUserId: "usr_admin",
      body: "The title review has started.",
    },
    {
      now: () => NOW + 100,
      randomUUID: () => "44444444-4444-4444-8444-444444444444",
    },
  );

  const memberFeed = await getMemberNotificationFeed(
    database,
    "usr_member_a",
  );
  const otherFeed = await getMemberNotificationFeed(database, "usr_member_b");
  assert.equal(memberFeed.unreadCount, 1);
  assert.equal(memberFeed.notifications[0].kind, "CONSULTATION_REPLY");
  assert.equal(otherFeed.unreadCount, 0);

  await assert.rejects(
    markMemberNotificationRead(database, {
      notificationId: memberFeed.notifications[0].id,
      userId: "usr_member_b",
    }),
    /Notification was not found/,
  );

  const readNotification = await markMemberNotificationRead(
    database,
    {
      notificationId: memberFeed.notifications[0].id,
      userId: "usr_member_a",
    },
    {
      now: () => NOW + 200,
      requestId: "req-notification-read",
    },
  );
  assert.equal(readNotification.readAt, NOW + 200);

  const repeated = await markMemberNotificationRead(
    database,
    {
      notificationId: memberFeed.notifications[0].id,
      userId: "usr_member_a",
    },
    { now: () => NOW + 300 },
  );
  assert.equal(repeated.readAt, NOW + 200);

  const feedAfterRead = await getMemberNotificationFeed(
    database,
    "usr_member_a",
  );
  assert.equal(feedAfterRead.unreadCount, 0);
  assert.equal(feedAfterRead.notifications[0].readAt, NOW + 200);
  assert.equal(
    sqlite
      .prepare(
        "SELECT count(*) AS count FROM audit_logs WHERE action = 'MEMBER_NOTIFICATION_READ'",
      )
      .get().count,
    1,
  );
});
