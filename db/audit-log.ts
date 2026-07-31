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

export async function getAuditDashboard(
  database: D1DatabaseLike,
  actorUserId: string,
  options: {
    category?: unknown;
    limit?: unknown;
    now?: number;
  } = {},
): Promise<AuditDashboard> {
  assertDatabase(database);
  await requireAdmin(database, actorUserId);

  const category = validateAuditCategory(options.category);
  const limit = validateLimit(options.limit);
  const now = validateNow(options.now);
  const categorySql = categoryPredicate(category);
  const eventRows = await database
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
       ${categorySql}
       ORDER BY audit_logs.created_at DESC, audit_logs.id DESC
       LIMIT ?`,
    )
    .bind(limit)
    .all<AuditRow>();

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

  return {
    category,
    metrics: {
      totalEvents,
      last24Hours,
      attentionEvents,
      sourceEvents,
    },
    events: (eventRows.results ?? []).map((row) => ({
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
    })),
  };
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
  if (/^(OPERATIONS_|OPERATIONAL_)/.test(action)) return "OPERATIONS";
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

function categoryPredicate(category: AuditCategory): string {
  switch (category) {
    case "IDENTITY":
      return "WHERE (audit_logs.action LIKE 'USER_%' OR audit_logs.action LIKE 'FAVORITE_%')";
    case "ASSET":
      return "WHERE audit_logs.action LIKE 'LISTING_%'";
    case "COLLECTION":
      return "WHERE audit_logs.action LIKE 'INGESTION_%'";
    case "SOURCE":
      return "WHERE audit_logs.action LIKE 'SOURCE_%'";
    case "CONSULTATION":
      return "WHERE audit_logs.action LIKE 'CONSULTATION_%'";
    case "MEMBERSHIP":
      return "WHERE (audit_logs.action LIKE 'CASH_%' OR audit_logs.action LIKE 'DEMO_CASH_%' OR audit_logs.action LIKE 'MEMBERSHIP_%' OR audit_logs.action LIKE 'PAYMENT_%')";
    case "OPERATIONS":
      return "WHERE (audit_logs.action LIKE 'OPERATIONS_%' OR audit_logs.action LIKE 'OPERATIONAL_%')";
    default:
      return "";
  }
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

