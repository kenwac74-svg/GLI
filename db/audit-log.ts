import type { D1DatabaseLike } from "./user-workflows.ts";

export const AUDIT_CATEGORIES = [
  "ALL",
  "IDENTITY",
  "ASSET",
  "COLLECTION",
  "SOURCE",
  "CONSULTATION",
  "MEMBERSHIP",
  "OPERATIONS",
] as const;

export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

export type AuditEvent = {
  id: number;
  actorUserId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  category: Exclude<AuditCategory, "ALL"> | "OTHER";
  resourceType: string;
  resourceId: string;
  before: unknown;
  after: unknown;
  requestId: string | null;
  createdAt: number;
};

export type AuditDashboard = {
  category: AuditCategory;
  metrics: {
    totalEvents: number;
    last24Hours: number;
    attentionEvents: number;
    sourceEvents: number;
  };
  events: AuditEvent[];
  page: {
    cursor: string | null;
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
};

export type AuditExport = {
  csv: string;
  category: AuditCategory;
  rowCount: number;
  truncated: boolean;
  from: number;
  to: number;
};

type AuditRow = {
  id: number;
  actorUserId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  beforeJson: string | null;
  afterJson: string | null;
  requestId: string | null;
  createdAt: number;
};

const SENSITIVE_KEY =
  /secret|token|password|authorization|credential|api.?key|private.?key|cookie/i;
const MAX_JSON_DEPTH = 6;
const MAX_ARRAY_ITEMS = 50;
const MAX_OBJECT_KEYS = 100;
const MAX_STRING_LENGTH = 1_000;
const AUDIT_EXPORT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const AUDIT_EXPORT_LIMIT = 1_000;

export async function getAuditDashboard(
  database: D1DatabaseLike,
  actorUserId: string,
  options: {
    category?: unknown;
    limit?: unknown;
    cursor?: unknown;
    now?: number;
  } = {},
): Promise<AuditDashboard> {
  assertDatabase(database);
  await requireAdmin(database, actorUserId);

  const category = validateAuditCategory(options.category);
  const limit = validateLimit(options.limit);
  const cursor = validateCursor(options.cursor);
  const now = validateNow(options.now);
  const eventRows = await queryAuditRows(database, {
    category,
    cursor,
    limit: limit + 1,
  });

  const [totalEvents, last24Hours, attentionEvents, sourceEvents] =
    await Promise.all([
      count(database, "SELECT COUNT(*) AS value FROM audit_logs"),
      count(
        database,
        "SELECT COUNT(*) AS value FROM audit_logs WHERE created_at >= ?",
        now - 24 * 60 * 60 * 1000,
      ),
      count(
        database,
        `SELECT COUNT(*) AS value FROM audit_logs
         WHERE action LIKE '%FAILED%'
            OR action LIKE '%HELD%'
            OR action LIKE '%REFUNDED%'
            OR action LIKE '%SUSPENDED%'`,
      ),
      count(
        database,
        `SELECT COUNT(*) AS value FROM audit_logs
         WHERE action LIKE 'SOURCE_%'
            OR action LIKE 'INGESTION_%'`,
      ),
    ]);

  const rows = eventRows.slice(0, limit);
  const events = rows.map(mapAuditRow);
  const lastEvent = events.at(-1);
  const hasMore = eventRows.length > limit;

  return {
    category,
    metrics: {
      totalEvents,
      last24Hours,
      attentionEvents,
      sourceEvents,
    },
    events,
    page: {
      cursor: cursor ? encodeCursor(cursor) : null,
      nextCursor:
        hasMore && lastEvent
          ? encodeCursor({ createdAt: lastEvent.createdAt, id: lastEvent.id })
          : null,
      hasMore,
      limit,
    },
  };
}

export async function exportAuditCsv(
  database: D1DatabaseLike,
  actorUserId: string,
  options: {
    category?: unknown;
    now?: number;
  } = {},
): Promise<AuditExport> {
  assertDatabase(database);
  await requireAdmin(database, actorUserId);

  const category = validateAuditCategory(options.category);
  const to = validateNow(options.now);
  const from = to - AUDIT_EXPORT_WINDOW_MS;
  const rows = await queryAuditRows(database, {
    category,
    from,
    limit: AUDIT_EXPORT_LIMIT + 1,
  });
  const truncated = rows.length > AUDIT_EXPORT_LIMIT;
  const events = rows.slice(0, AUDIT_EXPORT_LIMIT).map(mapAuditRow);

  return {
    csv: buildAuditCsv(events),
    category,
    rowCount: events.length,
    truncated,
    from,
    to,
  };
}

export function buildAuditCsv(events: AuditEvent[]): string {
  const headers = [
    "timestamp",
    "category",
    "action",
    "actor",
    "actor_email",
    "resource_type",
    "resource_id",
    "request_id",
    "before_json",
    "after_json",
  ];
  const rows = events.map((event) => [
    new Date(event.createdAt).toISOString(),
    event.category,
    event.action,
    event.actorName ?? event.actorUserId ?? "SYSTEM",
    event.actorEmail ?? "",
    event.resourceType,
    event.resourceId,
    event.requestId ?? "",
    serializeSnapshot(event.before),
    serializeSnapshot(event.after),
  ]);
  return `\uFEFF${[headers, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n")}\r\n`;
}

export function categoryForAction(
  action: string,
): Exclude<AuditCategory, "ALL"> | "OTHER" {
  if (/^(USER_|FAVORITE_)/.test(action)) return "IDENTITY";
  if (/^LISTING_/.test(action)) return "ASSET";
  if (/^INGESTION_/.test(action)) return "COLLECTION";
  if (/^SOURCE_/.test(action)) return "SOURCE";
  if (/^CONSULTATION_/.test(action)) return "CONSULTATION";
  if (/^(CASH_|DEMO_CASH_|MEMBERSHIP_|PAYMENT_)/.test(action)) {
    return "MEMBERSHIP";
  }
  if (/^(OPERATIONS_|OPERATIONAL_|BACKUP_)/.test(action)) {
    return "OPERATIONS";
  }
  return "OTHER";
}

export function parseAndRedact(value: string | null): unknown {
  if (value == null) return null;
  try {
    return redactJson(JSON.parse(value), 0);
  } catch {
    return "[INVALID JSON]";
  }
}

function redactJson(value: unknown, depth: number): unknown {
  if (depth > MAX_JSON_DEPTH) return "[MAX DEPTH]";
  if (typeof value === "string") {
    if (/^Bearer\s+/i.test(value)) return "[REDACTED]";
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}…`
      : value;
  }
  if (
    value == null ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    const items = value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => redactJson(item, depth + 1));
    if (value.length > MAX_ARRAY_ITEMS) items.push("[TRUNCATED]");
    return items;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).slice(
      0,
      MAX_OBJECT_KEYS,
    );
    const output: Record<string, unknown> = {};
    for (const [key, item] of entries) {
      output[key] = SENSITIVE_KEY.test(key)
        ? "[REDACTED]"
        : redactJson(item, depth + 1);
    }
    if (Object.keys(value).length > MAX_OBJECT_KEYS) {
      output.__truncated__ = true;
    }
    return output;
  }
  return String(value);
}

function categoryExpression(category: AuditCategory): string | null {
  switch (category) {
    case "IDENTITY":
      return "(audit_logs.action LIKE 'USER_%' OR audit_logs.action LIKE 'FAVORITE_%')";
    case "ASSET":
      return "audit_logs.action LIKE 'LISTING_%'";
    case "COLLECTION":
      return "audit_logs.action LIKE 'INGESTION_%'";
    case "SOURCE":
      return "audit_logs.action LIKE 'SOURCE_%'";
    case "CONSULTATION":
      return "audit_logs.action LIKE 'CONSULTATION_%'";
    case "MEMBERSHIP":
      return "(audit_logs.action LIKE 'CASH_%' OR audit_logs.action LIKE 'DEMO_CASH_%' OR audit_logs.action LIKE 'MEMBERSHIP_%' OR audit_logs.action LIKE 'PAYMENT_%')";
    case "OPERATIONS":
      return "(audit_logs.action LIKE 'OPERATIONS_%' OR audit_logs.action LIKE 'OPERATIONAL_%' OR audit_logs.action LIKE 'BACKUP_%')";
    default:
      return null;
  }
}

async function queryAuditRows(
  database: D1DatabaseLike,
  options: {
    category: AuditCategory;
    limit: number;
    cursor?: AuditCursor | null;
    from?: number;
  },
): Promise<AuditRow[]> {
  const predicates: string[] = [];
  const bindings: unknown[] = [];
  const category = categoryExpression(options.category);
  if (category) predicates.push(category);
  if (options.cursor) {
    predicates.push(
      "(audit_logs.created_at < ? OR (audit_logs.created_at = ? AND audit_logs.id < ?))",
    );
    bindings.push(
      options.cursor.createdAt,
      options.cursor.createdAt,
      options.cursor.id,
    );
  }
  if (options.from !== undefined) {
    predicates.push("audit_logs.created_at >= ?");
    bindings.push(options.from);
  }
  const where = predicates.length ? `WHERE ${predicates.join(" AND ")}` : "";
  const result = await database
    .prepare(
      `SELECT
         audit_logs.id,
         audit_logs.actor_user_id AS actorUserId,
         users.display_name AS actorName,
         users.email AS actorEmail,
         audit_logs.action,
         audit_logs.resource_type AS resourceType,
         audit_logs.resource_id AS resourceId,
         audit_logs.before_json AS beforeJson,
         audit_logs.after_json AS afterJson,
         audit_logs.request_id AS requestId,
         audit_logs.created_at AS createdAt
       FROM audit_logs
       LEFT JOIN users ON users.id = audit_logs.actor_user_id
       ${where}
       ORDER BY audit_logs.created_at DESC, audit_logs.id DESC
       LIMIT ?`,
    )
    .bind(...bindings, options.limit)
    .all<AuditRow>();
  return result.results ?? [];
}

function mapAuditRow(row: AuditRow): AuditEvent {
  return {
    id: Number(row.id),
    actorUserId: row.actorUserId,
    actorName: row.actorName,
    actorEmail: row.actorEmail,
    action: row.action,
    category: categoryForAction(row.action),
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    before: parseAndRedact(row.beforeJson),
    after: parseAndRedact(row.afterJson),
    requestId: row.requestId,
    createdAt: Number(row.createdAt),
  };
}

type AuditCursor = {
  createdAt: number;
  id: number;
};

function validateCursor(value: unknown): AuditCursor | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") {
    throw new TypeError("cursor must be a string");
  }
  const match = /^(\d{1,16})\.(\d{1,16})$/.exec(value);
  if (!match) throw new RangeError("cursor is invalid");
  const createdAt = Number(match[1]);
  const id = Number(match[2]);
  if (
    !Number.isSafeInteger(createdAt) ||
    createdAt < 0 ||
    !Number.isSafeInteger(id) ||
    id < 1
  ) {
    throw new RangeError("cursor is invalid");
  }
  return { createdAt, id };
}

function encodeCursor(cursor: AuditCursor): string {
  return `${cursor.createdAt}.${cursor.id}`;
}

function serializeSnapshot(value: unknown): string {
  return value == null ? "" : JSON.stringify(value);
}

function csvCell(value: unknown): string {
  let text = String(value ?? "").replaceAll("\0", "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function validateAuditCategory(value: unknown): AuditCategory {
  if (value == null || value === "") return "ALL";
  if (
    typeof value !== "string" ||
    !AUDIT_CATEGORIES.includes(value as AuditCategory)
  ) {
    throw new RangeError("category must be a supported audit category");
  }
  return value as AuditCategory;
}

function validateLimit(value: unknown): number {
  if (value == null) return 50;
  const limit =
    typeof value === "string" && /^\d+$/.test(value)
      ? Number(value)
      : value;
  if (!Number.isInteger(limit) || Number(limit) < 1 || Number(limit) > 100) {
    throw new RangeError("limit must be an integer between 1 and 100");
  }
  return Number(limit);
}

function validateNow(value: number | undefined): number {
  if (value == null) return Date.now();
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError("now must be a positive timestamp");
  }
  return value;
}

async function requireAdmin(
  database: D1DatabaseLike,
  userId: string,
): Promise<void> {
  if (typeof userId !== "string" || !userId) {
    throw new TypeError("actorUserId is required");
  }
  const user = await database
    .prepare("SELECT role, status FROM users WHERE id = ? LIMIT 1")
    .bind(userId)
    .first<{ role: string; status: string }>();
  if (!user || user.status !== "ACTIVE" || user.role !== "ADMIN") {
    throw new Error("An active administrator is required");
  }
}

async function count(
  database: D1DatabaseLike,
  sql: string,
  ...bindings: unknown[]
): Promise<number> {
  const statement = bindings.length
    ? database.prepare(sql).bind(...bindings)
    : database.prepare(sql);
  const row = await statement.first<{ value: number }>();
  return Number(row?.value ?? 0);
}

function assertDatabase(
  database: D1DatabaseLike,
): asserts database is D1DatabaseLike {
  if (!database || typeof database.prepare !== "function") {
    throw new TypeError("A D1 database binding is required");
  }
}

