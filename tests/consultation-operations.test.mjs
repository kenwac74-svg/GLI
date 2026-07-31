import assert from "node:assert/strict";
import test from "node:test";

import {
  listConsultations,
  updateConsultation,
} from "../db/consultation-operations.ts";

const NOW = Date.parse("2026-07-31T06:00:00.000Z");

class FakeD1 {
  constructor({ batch = true } = {}) {
    this.users = [
      {
        id: "usr_member",
        email: "member@example.com",
        displayName: "GLI Member",
        role: "MEMBER",
        status: "ACTIVE",
      },
      {
        id: "usr_admin",
        email: "admin@gli.local",
        displayName: "Operations Admin",
        role: "ADMIN",
        status: "ACTIVE",
      },
      {
        id: "usr_assignee",
        email: "advisor@gli.local",
        displayName: "Investment Advisor",
        role: "ADMIN",
        status: "ACTIVE",
      },
      {
        id: "usr_inactive_admin",
        email: "inactive@gli.local",
        displayName: "Inactive Admin",
        role: "ADMIN",
        status: "SUSPENDED",
      },
    ];
    this.listings = [
      {
        id: 1,
        publicId: "GLI-KH-001",
        title: "BKK1 rental residence",
      },
    ];
    this.consultations = [
      {
        id: "con_newer",
        userId: "usr_member",
        listingId: 1,
        requestText: "Please review the expected rental income.",
        preferredAt: NOW + 86_400_000,
        assigneeUserId: null,
        status: "RECEIVED",
        createdAt: NOW - 1_000,
        updatedAt: NOW - 1_000,
      },
      {
        id: "con_older",
        userId: "usr_member",
        listingId: null,
        requestText: "I need a general investment consultation.",
        preferredAt: null,
        assigneeUserId: "usr_assignee",
        status: "CONTACTED",
        createdAt: NOW - 2_000,
        updatedAt: NOW - 1_500,
      },
    ];
    this.consultationEvents = [];
    this.memberNotifications = [];
    this.auditLogs = [];
    this.statements = [];

    if (!batch) {
      this.batch = undefined;
    }
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
    return this.#read()[0] ?? null;
  }

  async all() {
    return { success: true, results: this.#read() };
  }

  async run() {
    const db = this.database;
    const sql = this.sql;
    const values = this.values;

    if (sql.startsWith("UPDATE consultations")) {
      const row = db.consultations.find(
        (consultation) => consultation.id === values[3],
      );
      if (!row) {
        return { success: true, meta: { changes: 0 } };
      }
      row.status = values[0];
      row.assigneeUserId = values[1];
      row.updatedAt = values[2];
    } else if (sql.startsWith("INSERT INTO consultation_events")) {
      db.consultationEvents.push({
        id: values[0],
        consultationId: values[1],
        actorUserId: values[2],
        eventType: "STATUS_CHANGED",
        body: null,
        status: values[3],
        createdAt: values[4],
      });
    } else if (sql.startsWith("INSERT INTO member_notifications")) {
      db.memberNotifications.push({
        id: values[0],
        userId: values[1],
        kind: values[2],
        title: values[3],
        body: values[4],
        href: values[5],
        resourceType: values[6],
        resourceId: values[7],
        eventKey: values[8],
        readAt: null,
        createdAt: values[9],
      });
    } else if (sql.startsWith("INSERT INTO audit_logs")) {
      db.auditLogs.push({
        actorUserId: values[0],
        action: "CONSULTATION_UPDATED",
        resourceType: "CONSULTATION",
        resourceId: values[1],
        beforeJson: values[2],
        afterJson: values[3],
        requestId: values[4],
        createdAt: values[5],
      });
    } else {
      throw new Error(`Unhandled write SQL: ${sql}`);
    }

    return { success: true, meta: { changes: 1 } };
  }

  #read() {
    const db = this.database;
    const sql = this.sql;

    if (sql.includes("FROM users") && sql.includes("WHERE id = ?")) {
      return db.users
        .filter((user) => user.id === this.values[0])
        .map(({ id, role, status }) => ({ id, role, status }));
    }
    if (sql.includes("FROM consultations c")) {
      let rows = db.consultations;
      if (sql.includes("WHERE c.id = ?")) {
        rows = rows.filter((row) => row.id === this.values[0]);
      }
      return rows
        .map((row) => this.#consultationView(row))
        .sort(
          (left, right) =>
            right.createdAt - left.createdAt ||
            right.id.localeCompare(left.id),
        );
    }

    throw new Error(`Unhandled read SQL: ${sql}`);
  }

  #consultationView(row) {
    const member = this.database.users.find(
      (user) => user.id === row.userId,
    );
    const listing = this.database.listings.find(
      (candidate) => candidate.id === row.listingId,
    );
    const assignee = this.database.users.find(
      (user) => user.id === row.assigneeUserId,
    );
    return {
      id: row.id,
      memberUserId: member.id,
      memberEmail: member.email,
      memberDisplayName: member.displayName,
      listingPublicId: listing?.publicId ?? null,
      listingTitle: listing?.title ?? null,
      requestText: row.requestText,
      preferredAt: row.preferredAt,
      assigneeUserId: assignee?.id ?? null,
      assigneeEmail: assignee?.email ?? null,
      assigneeDisplayName: assignee?.displayName ?? null,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

test("lists consultations with member, listing, assignee, and timing data", async () => {
  const database = new FakeD1();
  const consultations = await listConsultations(database);

  assert.equal(consultations.length, 2);
  assert.deepEqual(consultations[0], {
    id: "con_newer",
    memberUserId: "usr_member",
    memberEmail: "member@example.com",
    memberDisplayName: "GLI Member",
    listingPublicId: "GLI-KH-001",
    listingTitle: "BKK1 rental residence",
    requestText: "Please review the expected rental income.",
    preferredAt: NOW + 86_400_000,
    assigneeUserId: null,
    assigneeEmail: null,
    assigneeDisplayName: null,
    status: "RECEIVED",
    priority: "STANDARD",
    createdAt: NOW - 1_000,
    updatedAt: NOW - 1_000,
  });
  assert.equal(consultations[1].listingPublicId, null);
  assert.equal(consultations[1].assigneeEmail, "advisor@gli.local");
});

test("updates status and assignee without D1 batch and records authority data", async () => {
  const database = new FakeD1({ batch: false });
  const updated = await updateConsultation(
    database,
    {
      consultationId: "con_newer",
      status: "CONTACTED",
      assigneeUserId: "usr_assignee",
      actorUserId: "usr_admin",
      requestId: "req-consultation-1",
    },
    {
      now: () => NOW,
      randomUUID: () => "33333333-3333-4333-8333-333333333333",
    },
  );

  assert.equal(updated.status, "CONTACTED");
  assert.equal(updated.assigneeUserId, "usr_assignee");
  assert.equal(updated.assigneeDisplayName, "Investment Advisor");
  assert.equal(updated.updatedAt, NOW);

  assert.equal(database.auditLogs.length, 1);
  assert.deepEqual(database.consultationEvents, [
    {
      id: "cevt_33333333-3333-4333-8333-333333333333",
      consultationId: "con_newer",
      actorUserId: "usr_admin",
      eventType: "STATUS_CHANGED",
      body: null,
      status: "CONTACTED",
      createdAt: NOW,
    },
  ]);
  assert.deepEqual(database.memberNotifications, [
    {
      id: "mnot_33333333-3333-4333-8333-333333333333",
      userId: "usr_member",
      kind: "CONSULTATION_STATUS",
      title: "상담 상태가 변경되었습니다",
      body: "BKK1 rental residence 상담이 담당자 연락 중 상태로 변경되었습니다.",
      href: "/my/consultations/con_newer",
      resourceType: "CONSULTATION",
      resourceId: "con_newer",
      eventKey: "cevt_33333333-3333-4333-8333-333333333333",
      readAt: null,
      createdAt: NOW,
    },
  ]);
  assert.deepEqual(database.auditLogs[0], {
    actorUserId: "usr_admin",
    action: "CONSULTATION_UPDATED",
    resourceType: "CONSULTATION",
    resourceId: "con_newer",
    beforeJson: JSON.stringify({
      status: "RECEIVED",
      assigneeUserId: null,
    }),
    afterJson: JSON.stringify({
      status: "CONTACTED",
      assigneeUserId: "usr_assignee",
    }),
    requestId: "req-consultation-1",
    createdAt: NOW,
  });

  const updateStatement = database.statements.find((statement) =>
    statement.sql.startsWith("UPDATE consultations"),
  );
  assert.match(updateStatement.sql, /status = \?/);
  assert.deepEqual(updateStatement.values, [
    "CONTACTED",
    "usr_assignee",
    NOW,
    "con_newer",
  ]);
});

test("rejects illegal transitions without changing or auditing the consultation", async () => {
  const database = new FakeD1();

  await assert.rejects(
    updateConsultation(database, {
      consultationId: "con_newer",
      status: "COMPLETED",
      actorUserId: "usr_admin",
    }),
    /cannot transition from RECEIVED to COMPLETED/,
  );

  assert.equal(database.consultations[0].status, "RECEIVED");
  assert.equal(database.consultations[0].assigneeUserId, null);
  assert.equal(database.auditLogs.length, 0);
  assert.equal(database.consultationEvents.length, 0);
  assert.equal(database.memberNotifications.length, 0);
});

test("allows a same-state request idempotently and enforces admin permissions", async () => {
  const database = new FakeD1();
  const originalUpdatedAt = database.consultations[0].updatedAt;

  const unchanged = await updateConsultation(database, {
    consultationId: "con_newer",
    status: "RECEIVED",
    actorUserId: "usr_admin",
  });

  assert.equal(unchanged.updatedAt, originalUpdatedAt);
  assert.equal(database.auditLogs.length, 0);
  assert.equal(database.consultationEvents.length, 0);
  assert.equal(database.memberNotifications.length, 0);

  await assert.rejects(
    updateConsultation(database, {
      consultationId: "con_newer",
      status: "CONTACTED",
      actorUserId: "usr_member",
    }),
    /Actor must be an active ADMIN user/,
  );
  await assert.rejects(
    updateConsultation(database, {
      consultationId: "con_newer",
      status: "CONTACTED",
      assigneeUserId: "usr_inactive_admin",
      actorUserId: "usr_admin",
    }),
    /Assignee must be an active ADMIN user/,
  );
  assert.equal(database.auditLogs.length, 0);
});

test("validates identifiers, statuses, request ids, and the operation clock", async () => {
  const database = new FakeD1();

  await assert.rejects(
    updateConsultation(database, {
      consultationId: "con_newer",
      status: "UNKNOWN",
      actorUserId: "usr_admin",
    }),
    /status must be one of/,
  );
  await assert.rejects(
    updateConsultation(database, {
      consultationId: "con_newer",
      status: "CONTACTED",
      actorUserId: "usr admin",
    }),
    /actorUserId is invalid/,
  );
  await assert.rejects(
    updateConsultation(database, {
      consultationId: "con_newer",
      status: "CONTACTED",
      actorUserId: "usr_admin",
      requestId: "bad request id",
    }),
    /requestId is invalid/,
  );
  await assert.rejects(
    updateConsultation(
      database,
      {
        consultationId: "con_newer",
        status: "CONTACTED",
        actorUserId: "usr_admin",
      },
      { now: () => 0 },
    ),
    /positive integer timestamp/,
  );
});
