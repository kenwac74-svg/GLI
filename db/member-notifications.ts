import type {
  D1DatabaseLike,
  D1StatementLike,
} from "./user-workflows.ts";

export type MemberNotification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string;
  resourceType: string;
  resourceId: string;
  readAt: number | null;
  createdAt: number;
};

export type MemberNotificationFeed = {
  notifications: MemberNotification[];
  unreadCount: number;
};

type NotificationInsert = {
  id: string;
  userId: string;
  kind: string;
  title: string;
  body: string;
  href: string;
  resourceType: string;
  resourceId: string;
  eventKey: string;
  createdAt: number;
};

type NotificationOptions = {
  now?: () => number;
  requestId?: string | null;
};

export async function getMemberNotificationFeed(
  database: D1DatabaseLike,
  userId: string,
  limit = 8,
): Promise<MemberNotificationFeed> {
  assertDatabase(database);
  const memberUserId = validateOpaqueId(userId, "userId");
  await requireActiveUser(database, memberUserId);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 20) {
    throw new RangeError("limit must be an integer between 1 and 20");
  }

  const [notificationResult, countRow] = await Promise.all([
    database
      .prepare(`
        SELECT
          id,
          kind,
          title,
          body,
          href,
          resource_type AS resourceType,
          resource_id AS resourceId,
          read_at AS readAt,
          created_at AS createdAt
        FROM member_notifications
        WHERE user_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT ?
      `)
      .bind(memberUserId, limit)
      .all<MemberNotification>(),
    database
      .prepare(`
        SELECT count(*) AS unreadCount
        FROM member_notifications
        WHERE user_id = ? AND read_at IS NULL
      `)
      .bind(memberUserId)
      .first<{ unreadCount: number }>(),
  ]);

  if (notificationResult.success === false) {
    throw new Error("Unable to load member notifications");
  }

  return {
    notifications: (notificationResult.results ?? []).map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      body: row.body,
      href: row.href,
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      readAt: row.readAt,
      createdAt: row.createdAt,
    })),
    unreadCount: Number(countRow?.unreadCount ?? 0),
  };
}

export async function markMemberNotificationRead(
  database: D1DatabaseLike,
  input: { notificationId: string; userId: string },
  options: NotificationOptions = {},
): Promise<MemberNotification> {
  assertDatabase(database);
  const notificationId = validateOpaqueId(
    input.notificationId,
    "notificationId",
  );
  const userId = validateOpaqueId(input.userId, "userId");
  const requestId = normalizeRequestId(options.requestId);
  await requireActiveUser(database, userId);

  const current = await getOwnedNotification(database, notificationId, userId);
  if (!current) throw new Error("Notification was not found");
  if (current.readAt !== null) return current;

  const now = getNow(options);
  await executeWrites(database, [
    database
      .prepare(`
        UPDATE member_notifications
        SET read_at = ?
        WHERE id = ? AND user_id = ? AND read_at IS NULL
      `)
      .bind(now, notificationId, userId),
    database
      .prepare(`
        INSERT INTO audit_logs (
          actor_user_id, action, resource_type, resource_id,
          before_json, after_json, request_id, created_at
        ) VALUES (?, 'MEMBER_NOTIFICATION_READ', 'MEMBER_NOTIFICATION', ?, ?, ?, ?, ?)
      `)
      .bind(
        userId,
        notificationId,
        JSON.stringify({ readAt: null }),
        JSON.stringify({ readAt: now }),
        requestId,
        now,
      ),
  ]);

  return { ...current, readAt: now };
}

export function memberNotificationInsertStatement(
  database: D1DatabaseLike,
  input: NotificationInsert,
): D1StatementLike {
  assertDatabase(database);
  const id = validateOpaqueId(input.id, "notificationId");
  const userId = validateOpaqueId(input.userId, "userId");
  const kind = validateToken(input.kind, "kind");
  const title = validateText(input.title, "title", 1, 120);
  const body = validateText(input.body, "body", 1, 300);
  const href = validateHref(input.href);
  const resourceType = validateToken(input.resourceType, "resourceType");
  const resourceId = validateOpaqueId(input.resourceId, "resourceId");
  const eventKey = validateOpaqueId(input.eventKey, "eventKey");
  const createdAt = validateTimestamp(input.createdAt, "createdAt");

  return database
    .prepare(`
      INSERT INTO member_notifications (
        id, user_id, kind, title, body, href,
        resource_type, resource_id, event_key, read_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
    `)
    .bind(
      id,
      userId,
      kind,
      title,
      body,
      href,
      resourceType,
      resourceId,
      eventKey,
      createdAt,
    );
}

async function getOwnedNotification(
  database: D1DatabaseLike,
  notificationId: string,
  userId: string,
): Promise<MemberNotification | null> {
  return database
    .prepare(`
      SELECT
        id,
        kind,
        title,
        body,
        href,
        resource_type AS resourceType,
        resource_id AS resourceId,
        read_at AS readAt,
        created_at AS createdAt
      FROM member_notifications
      WHERE id = ? AND user_id = ?
      LIMIT 1
    `)
    .bind(notificationId, userId)
    .first<MemberNotification>();
}

async function requireActiveUser(
  database: D1DatabaseLike,
  userId: string,
): Promise<void> {
  const user = await database
    .prepare("SELECT id, status FROM users WHERE id = ? LIMIT 1")
    .bind(userId)
    .first<{ id: string; status: string }>();
  if (!user || user.status !== "ACTIVE") {
    throw new Error("Active member was not found");
  }
}

function validateText(
  value: unknown,
  fieldName: string,
  minimum: number,
  maximum: number,
): string {
  if (typeof value !== "string") {
    throw new TypeError(`${fieldName} must be a string`);
  }
  const normalized = value.trim();
  if (normalized.length < minimum || normalized.length > maximum) {
    throw new RangeError(
      `${fieldName} must be between ${minimum} and ${maximum} characters`,
    );
  }
  return normalized;
}

function validateToken(value: unknown, fieldName: string): string {
  const token = validateText(value, fieldName, 1, 64);
  if (!/^[A-Z][A-Z0-9_]*$/.test(token)) {
    throw new TypeError(`${fieldName} is invalid`);
  }
  return token;
}

function validateHref(value: unknown): string {
  const href = validateText(value, "href", 1, 300);
  if (!href.startsWith("/") || href.startsWith("//") || /[\r\n]/.test(href)) {
    throw new TypeError("href must be a same-origin path");
  }
  return href;
}

function validateOpaqueId(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new TypeError(`${fieldName} must be a string`);
  }
  const normalized = value.trim();
  if (
    normalized.length < 1 ||
    normalized.length > 160 ||
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

function validateTimestamp(value: unknown, fieldName: string): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new TypeError(`${fieldName} must be a positive integer timestamp`);
  }
  return Number(value);
}

function getNow(options: NotificationOptions): number {
  return validateTimestamp(options.now?.() ?? Date.now(), "now");
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
