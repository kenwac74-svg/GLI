import type {
  D1DatabaseLike,
  D1StatementLike,
} from "./user-workflows.ts";

export const CONSULTATION_STATUSES = [
  "RECEIVED",
  "CONTACTED",
  "SCHEDULED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type ConsultationStatus = (typeof CONSULTATION_STATUSES)[number];

export type OperationsConsultation = {
  id: string;
  memberUserId: string;
  memberEmail: string;
  memberDisplayName: string | null;
  listingPublicId: string | null;
  listingTitle: string | null;
  requestText: string;
  preferredAt: number | null;
  assigneeUserId: string | null;
  assigneeEmail: string | null;
  assigneeDisplayName: string | null;
  status: ConsultationStatus;
  createdAt: number;
  updatedAt: number;
};

export type UpdateConsultationInput = {
  consultationId: string;
  status: ConsultationStatus;
  assigneeUserId?: string | null;
  actorUserId: string;
  requestId?: string | null;
};

export type ConsultationOperationOptions = {
  now?: () => number;
};

type UserPermissionRow = {
  id: string;
  role: string;
  status: string;
};

const ALLOWED_TRANSITIONS: Readonly<
  Record<ConsultationStatus, ReadonlySet<ConsultationStatus>>
> = {
  RECEIVED: new Set(["RECEIVED", "CONTACTED", "CANCELLED"]),
  CONTACTED: new Set(["CONTACTED", "SCHEDULED", "CANCELLED"]),
  SCHEDULED: new Set(["SCHEDULED", "COMPLETED", "CANCELLED"]),
  COMPLETED: new Set(["COMPLETED"]),
  CANCELLED: new Set(["CANCELLED"]),
};

const CONSULTATION_SELECT = `
  SELECT
    c.id,
    member.id AS memberUserId,
    member.email AS memberEmail,
    member.display_name AS memberDisplayName,
    l.public_id AS listingPublicId,
    l.title AS listingTitle,
    c.request_text AS requestText,
    c.preferred_at AS preferredAt,
    assignee.id AS assigneeUserId,
    assignee.email AS assigneeEmail,
    assignee.display_name AS assigneeDisplayName,
    c.status,
    c.created_at AS createdAt,
    c.updated_at AS updatedAt
  FROM consultations c
  INNER JOIN users member ON member.id = c.user_id
  LEFT JOIN listings l ON l.id = c.listing_id
  LEFT JOIN users assignee ON assignee.id = c.assignee_user_id
`;

export async function listConsultations(
  database: D1DatabaseLike,
): Promise<OperationsConsultation[]> {
  assertDatabase(database);
  const result = await database
    .prepare(`
      ${CONSULTATION_SELECT}
      ORDER BY c.created_at DESC, c.id DESC
    `)
    .all<OperationsConsultation>();

  if (result.success === false) {
    throw new Error("Unable to list consultations");
  }

  return (result.results ?? []).map(validateConsultationRow);
}

export async function updateConsultation(
  database: D1DatabaseLike,
  input: UpdateConsultationInput,
  options: ConsultationOperationOptions = {},
): Promise<OperationsConsultation> {
  assertDatabase(database);
  if (!input || typeof input !== "object") {
    throw new TypeError("input must be an object");
  }

  const consultationId = validateOpaqueId(
    input.consultationId,
    "consultationId",
  );
  const status = normalizeStatus(input.status);
  const actorUserId = validateOpaqueId(input.actorUserId, "actorUserId");
  const requestId = normalizeRequestId(input.requestId);
  const actor = await requireActiveAdmin(database, actorUserId, "Actor");
  const current = await getConsultation(database, consultationId);

  if (!current) {
    throw new Error(`Consultation ${consultationId} was not found`);
  }
  if (!ALLOWED_TRANSITIONS[current.status].has(status)) {
    throw new Error(
      `Consultation status cannot transition from ${current.status} to ${status}`,
    );
  }

  let nextAssigneeUserId = current.assigneeUserId;
  if (input.assigneeUserId !== undefined) {
    nextAssigneeUserId =
      input.assigneeUserId === null
        ? null
        : validateOpaqueId(input.assigneeUserId, "assigneeUserId");
    if (nextAssigneeUserId !== null) {
      await requireActiveAdmin(database, nextAssigneeUserId, "Assignee");
    }
  }

  if (
    current.status === status &&
    current.assigneeUserId === nextAssigneeUserId
  ) {
    return current;
  }

  const now = getNow(options);
  const before = {
    status: current.status,
    assigneeUserId: current.assigneeUserId,
  };
  const after = {
    status,
    assigneeUserId: nextAssigneeUserId,
  };
  const statements = [
    database
      .prepare(`
        UPDATE consultations
        SET status = ?, assignee_user_id = ?, updated_at = ?
        WHERE id = ?
      `)
      .bind(status, nextAssigneeUserId, now, consultationId),
    database
      .prepare(`
        INSERT INTO audit_logs (
          actor_user_id, action, resource_type, resource_id,
          before_json, after_json, request_id, created_at
        ) VALUES (?, 'CONSULTATION_UPDATED', 'CONSULTATION', ?, ?, ?, ?, ?)
      `)
      .bind(
        actor.id,
        consultationId,
        JSON.stringify(before),
        JSON.stringify(after),
        requestId,
        now,
      ),
  ];

  await executeWrites(database, statements);

  const updated = await getConsultation(database, consultationId);
  if (!updated) {
    throw new Error(`Consultation ${consultationId} was not found after update`);
  }
  return updated;
}

async function getConsultation(
  database: D1DatabaseLike,
  consultationId: string,
): Promise<OperationsConsultation | null> {
  const row = await database
    .prepare(`
      ${CONSULTATION_SELECT}
      WHERE c.id = ?
      LIMIT 1
    `)
    .bind(consultationId)
    .first<OperationsConsultation>();

  return row ? validateConsultationRow(row) : null;
}

async function requireActiveAdmin(
  database: D1DatabaseLike,
  userId: string,
  label: "Actor" | "Assignee",
): Promise<UserPermissionRow> {
  const user = await database
    .prepare(`
      SELECT id, role, status
      FROM users
      WHERE id = ?
      LIMIT 1
    `)
    .bind(userId)
    .first<UserPermissionRow>();

  if (!user) {
    throw new Error(`${label} user was not found`);
  }
  if (user.status !== "ACTIVE" || user.role !== "ADMIN") {
    throw new Error(`${label} must be an active ADMIN user`);
  }
  return user;
}

function validateConsultationRow(
  row: OperationsConsultation,
): OperationsConsultation {
  return {
    ...row,
    status: normalizeStatus(row.status),
  };
}

function normalizeStatus(value: unknown): ConsultationStatus {
  if (typeof value !== "string") {
    throw new TypeError("status must be a string");
  }
  const status = value.trim().toUpperCase();
  if (!(CONSULTATION_STATUSES as readonly string[]).includes(status)) {
    throw new TypeError(
      `status must be one of: ${CONSULTATION_STATUSES.join(", ")}`,
    );
  }
  return status as ConsultationStatus;
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

function getNow(options: ConsultationOperationOptions): number {
  const now = options.now?.() ?? Date.now();
  if (!Number.isSafeInteger(now) || now <= 0) {
    throw new TypeError("now must return a positive integer timestamp");
  }
  return now;
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
    if (result.success === false) {
      throw new Error("D1 write failed");
    }
  }
}

function assertDatabase(
  database: D1DatabaseLike,
): asserts database is D1DatabaseLike {
  if (!database || typeof database.prepare !== "function") {
    throw new TypeError("A D1 database binding is required");
  }
}
