import type {
  D1DatabaseLike,
  D1StatementLike,
} from "./user-workflows.ts";
import type { ConsultationStatus } from "./consultation-operations.ts";
import { memberNotificationInsertStatement } from "./member-notifications.ts";

export type ConsultationEventType =
  | "MEMBER_MESSAGE"
  | "OPERATOR_MESSAGE"
  | "STATUS_CHANGED";

export type ConsultationThreadEvent = {
  id: string;
  eventType: ConsultationEventType;
  body: string | null;
  status: string | null;
  createdAt: number;
};

export type ConsultationThread = {
  id: string;
  memberUserId: string;
  listingPublicId: string | null;
  listingTitle: string | null;
  requestText: string;
  preferredAt: number | null;
  assigneeDisplayName: string | null;
  status: ConsultationStatus;
  createdAt: number;
  updatedAt: number;
  events: ConsultationThreadEvent[];
};

type ConsultationRow = Omit<ConsultationThread, "events">;

type MessageOptions = {
  now?: () => number;
  randomUUID?: () => string;
  requestId?: string | null;
};

export async function getMemberConsultationThread(
  database: D1DatabaseLike,
  input: { consultationId: string; memberUserId: string },
): Promise<ConsultationThread | null> {
  assertDatabase(database);
  const consultationId = validateOpaqueId(
    input.consultationId,
    "consultationId",
  );
  const memberUserId = validateOpaqueId(input.memberUserId, "memberUserId");
  await requireActiveUser(database, memberUserId);
  return getThread(database, consultationId, memberUserId);
}

export async function getAdminConsultationThread(
  database: D1DatabaseLike,
  input: { consultationId: string; actorUserId: string },
): Promise<ConsultationThread | null> {
  assertDatabase(database);
  const consultationId = validateOpaqueId(
    input.consultationId,
    "consultationId",
  );
  const actorUserId = validateOpaqueId(input.actorUserId, "actorUserId");
  await requireActiveAdmin(database, actorUserId);
  return getThread(database, consultationId, null);
}

export async function addMemberConsultationMessage(
  database: D1DatabaseLike,
  input: {
    consultationId: string;
    memberUserId: string;
    body: string;
  },
  options: MessageOptions = {},
): Promise<ConsultationThreadEvent> {
  const thread = await getMemberConsultationThread(database, input);
  if (!thread) throw new Error("Consultation was not found");
  if (thread.status === "COMPLETED" || thread.status === "CANCELLED") {
    throw new Error("Closed consultations cannot receive messages");
  }
  return addMessage(
    database,
    {
      consultationId: thread.id,
      actorUserId: input.memberUserId,
      eventType: "MEMBER_MESSAGE",
      body: input.body,
    },
    options,
  );
}

export async function addOperatorConsultationMessage(
  database: D1DatabaseLike,
  input: {
    consultationId: string;
    actorUserId: string;
    body: string;
  },
  options: MessageOptions = {},
): Promise<ConsultationThreadEvent> {
  const thread = await getAdminConsultationThread(database, input);
  if (!thread) throw new Error("Consultation was not found");
  return addMessage(
    database,
    {
      consultationId: thread.id,
      actorUserId: input.actorUserId,
      eventType: "OPERATOR_MESSAGE",
      body: input.body,
      notifyUserId: thread.memberUserId,
      listingTitle: thread.listingTitle,
    },
    options,
  );
}

async function getThread(
  database: D1DatabaseLike,
  consultationId: string,
  memberUserId: string | null,
): Promise<ConsultationThread | null> {
  const memberConstraint = memberUserId === null ? "" : "AND c.user_id = ?";
  const statement = database
    .prepare(`
      SELECT
        c.id,
        c.user_id AS memberUserId,
        l.public_id AS listingPublicId,
        l.title AS listingTitle,
        c.request_text AS requestText,
        c.preferred_at AS preferredAt,
        assignee.display_name AS assigneeDisplayName,
        c.status,
        c.created_at AS createdAt,
        c.updated_at AS updatedAt
      FROM consultations c
      LEFT JOIN listings l ON l.id = c.listing_id
      LEFT JOIN users assignee ON assignee.id = c.assignee_user_id
      WHERE c.id = ? ${memberConstraint}
      LIMIT 1
    `)
    .bind(
      ...(memberUserId === null
        ? [consultationId]
        : [consultationId, memberUserId]),
    );
  const consultation = await statement.first<ConsultationRow>();
  if (!consultation) return null;

  const eventResult = await database
    .prepare(`
      SELECT
        id,
        event_type AS eventType,
        body,
        status,
        created_at AS createdAt
      FROM consultation_events
      WHERE consultation_id = ?
      ORDER BY created_at ASC, id ASC
    `)
    .bind(consultationId)
    .all<ConsultationThreadEvent>();

  if (eventResult.success === false) {
    throw new Error("Unable to load consultation events");
  }

  return {
    ...consultation,
    events: (eventResult.results ?? []).map(validateEvent),
  };
}

async function addMessage(
  database: D1DatabaseLike,
  input: {
    consultationId: string;
    actorUserId: string;
    eventType: "MEMBER_MESSAGE" | "OPERATOR_MESSAGE";
    body: string;
    notifyUserId?: string;
    listingTitle?: string | null;
  },
  options: MessageOptions,
): Promise<ConsultationThreadEvent> {
  const body = normalizeMessage(input.body);
  const now = getNow(options);
  const uuid = getRandomUUID(options);
  const id = `cevt_${uuid}`;
  const requestId = normalizeRequestId(options.requestId);

  const statements = [
    database
      .prepare(`
        INSERT INTO consultation_events (
          id, consultation_id, actor_user_id, event_type,
          body, status, created_at
        ) VALUES (?, ?, ?, ?, ?, NULL, ?)
      `)
      .bind(
        id,
        input.consultationId,
        input.actorUserId,
        input.eventType,
        body,
        now,
      ),
    database
      .prepare(`
        UPDATE consultations
        SET updated_at = ?
        WHERE id = ?
      `)
      .bind(now, input.consultationId),
    database
      .prepare(`
        INSERT INTO audit_logs (
          actor_user_id, action, resource_type, resource_id,
          before_json, after_json, request_id, created_at
        ) VALUES (?, 'CONSULTATION_MESSAGE_ADDED', 'CONSULTATION', ?, NULL, ?, ?, ?)
      `)
      .bind(
        input.actorUserId,
        input.consultationId,
        JSON.stringify({
          eventId: id,
          eventType: input.eventType,
          bodyLength: body.length,
        }),
        requestId,
        now,
      ),
  ];
  if (input.notifyUserId) {
    const caseLabel = input.listingTitle?.trim() || "자산 상담";
    statements.push(
      memberNotificationInsertStatement(database, {
        id: `mnot_${uuid}`,
        userId: input.notifyUserId,
        kind: "CONSULTATION_REPLY",
        title: "상담팀의 새 답변",
        body: `${caseLabel}에 새 답변이 등록되었습니다.`,
        href: `/my/consultations/${encodeURIComponent(input.consultationId)}`,
        resourceType: "CONSULTATION",
        resourceId: input.consultationId,
        eventKey: id,
        createdAt: now,
      }),
    );
  }

  await executeWrites(database, statements);

  return {
    id,
    eventType: input.eventType,
    body,
    status: null,
    createdAt: now,
  };
}

async function requireActiveUser(
  database: D1DatabaseLike,
  userId: string,
): Promise<void> {
  const user = await database
    .prepare("SELECT id, role, status FROM users WHERE id = ? LIMIT 1")
    .bind(userId)
    .first<{ id: string; role: string; status: string }>();
  if (!user || user.status !== "ACTIVE") {
    throw new Error("Active member was not found");
  }
}

async function requireActiveAdmin(
  database: D1DatabaseLike,
  userId: string,
): Promise<void> {
  const user = await database
    .prepare("SELECT id, role, status FROM users WHERE id = ? LIMIT 1")
    .bind(userId)
    .first<{ id: string; role: string; status: string }>();
  if (!user || user.status !== "ACTIVE" || user.role !== "ADMIN") {
    throw new Error("Actor must be an active ADMIN user");
  }
}

function validateEvent(row: ConsultationThreadEvent): ConsultationThreadEvent {
  if (
    row.eventType !== "MEMBER_MESSAGE" &&
    row.eventType !== "OPERATOR_MESSAGE" &&
    row.eventType !== "STATUS_CHANGED"
  ) {
    throw new Error("Consultation event type is invalid");
  }
  return row;
}

function normalizeMessage(value: unknown): string {
  if (typeof value !== "string") {
    throw new TypeError("message must be a string");
  }
  const message = value.trim();
  if (message.length < 2 || message.length > 1200) {
    throw new RangeError("message must be between 2 and 1200 characters");
  }
  return message;
}

function validateOpaqueId(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new TypeError(`${fieldName} must be a string`);
  }
  const normalized = value.trim();
  if (
    normalized.length < 1 ||
    normalized.length > 128 ||
    !/^[A-Za-z0-9._:-]+$/.test(normalized)
  ) {
    throw new TypeError(`${fieldName} is invalid`);
  }
  return normalized;
}

function normalizeRequestId(value: unknown): string | null {
  if (value == null) return null;
  return validateOpaqueId(value, "requestId");
}

function getNow(options: MessageOptions): number {
  const now = options.now?.() ?? Date.now();
  if (!Number.isSafeInteger(now) || now <= 0) {
    throw new TypeError("now must return a positive integer timestamp");
  }
  return now;
}

function getRandomUUID(options: MessageOptions): string {
  const value = options.randomUUID?.() ?? crypto.randomUUID();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new TypeError("randomUUID must return a UUID");
  }
  return value.toLowerCase();
}

async function executeWrites(
  database: D1DatabaseLike,
  statements: D1StatementLike[],
): Promise<void> {
  if (typeof database.batch === "function") {
    const results = await database.batch(statements);
    if (results.some((result) => result.success === false)) {
      throw new Error("D1 batch write failed");
    }
    return;
  }
  for (const statement of statements) {
    const result = await statement.run();
    if (result.success === false) throw new Error("D1 write failed");
  }
}

function assertDatabase(
  database: D1DatabaseLike,
): asserts database is D1DatabaseLike {
  if (!database || typeof database.prepare !== "function") {
    throw new TypeError("A D1 database binding is required");
  }
}
