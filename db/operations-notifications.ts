import type { D1DatabaseLike } from "./user-workflows.ts";

export type PendingOperationalNotification = {
  id: number;
  category: string;
  severity: string;
  title: string;
  detail: string;
  resourceType: string | null;
  resourceId: string | null;
  occurrenceCount: number;
  lastSeenAt: number;
};

export type OperationalNotificationBatch = {
  schemaVersion: "gli.operations-alerts.v1";
  generatedAt: number;
  openCritical: number;
  openWarnings: number;
  alerts: PendingOperationalNotification[];
};

export async function loadPendingOperationalNotificationBatch(
  database: D1DatabaseLike,
  now = Date.now(),
  limit = 20,
): Promise<OperationalNotificationBatch | null> {
  assertDatabase(database);
  const timestamp = validateTimestamp(now, "now");
  const batchLimit = validateIntegerRange(limit, "limit", 1, 50);
  const rows = await database
    .prepare(
      `SELECT
         id, category, severity, title, detail,
         resource_type AS resourceType,
         resource_id AS resourceId,
         occurrence_count AS occurrenceCount,
         last_seen_at AS lastSeenAt
       FROM operational_alerts
       WHERE status != 'RESOLVED'
         AND occurrence_count > notified_occurrence_count
       ORDER BY
         CASE severity WHEN 'CRITICAL' THEN 0 ELSE 1 END,
         last_seen_at ASC,
         id ASC
       LIMIT ?`,
    )
    .bind(batchLimit)
    .all<PendingOperationalNotification>();
  const alerts = rows.results ?? [];
  if (!alerts.length) return null;

  return {
    schemaVersion: "gli.operations-alerts.v1",
    generatedAt: timestamp,
    openCritical: alerts.filter((alert) => alert.severity === "CRITICAL").length,
    openWarnings: alerts.filter((alert) => alert.severity === "WARNING").length,
    alerts,
  };
}

export async function sendOperationalNotificationBatch(
  batch: OperationalNotificationBatch,
  options: {
    webhookUrl: string;
    allowedHosts: readonly string[];
    bearerToken?: string;
    fetchImpl?: typeof fetch;
  },
): Promise<void> {
  assertNotificationBatch(batch);
  const webhookUrl = parseAllowedWebhookUrl(
    options.webhookUrl,
    options.allowedHosts,
  );
  const bearerToken = optionalSecret(options.bearerToken, "bearerToken");
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(bearerToken ? { authorization: `Bearer ${bearerToken}` } : {}),
    },
    body: JSON.stringify({
      schemaVersion: batch.schemaVersion,
      generatedAt: new Date(batch.generatedAt).toISOString(),
      summary: {
        critical: batch.openCritical,
        warnings: batch.openWarnings,
      },
      alerts: batch.alerts.map((alert) => ({
        id: alert.id,
        category: alert.category,
        severity: alert.severity,
        title: alert.title,
        detail: alert.detail,
        resourceType: alert.resourceType,
        resourceId: alert.resourceId,
        occurrenceCount: alert.occurrenceCount,
        lastSeenAt: new Date(alert.lastSeenAt).toISOString(),
      })),
    }),
  });
  if (!response.ok) {
    throw new Error(`Operations notification returned HTTP ${response.status}`);
  }
}

export async function markOperationalNotificationDelivered(
  database: D1DatabaseLike,
  input: {
    actorUserId: string;
    alerts: readonly Pick<
      PendingOperationalNotification,
      "id" | "occurrenceCount"
    >[];
  },
  now = Date.now(),
): Promise<number> {
  assertDatabase(database);
  const actorUserId = validateIdentifier(input.actorUserId, "actorUserId");
  const timestamp = validateTimestamp(now, "now");
  await requireAdmin(database, actorUserId);
  if (!Array.isArray(input.alerts) || !input.alerts.length) {
    throw new TypeError("alerts must contain at least one item");
  }

  let delivered = 0;
  for (const alert of input.alerts) {
    const alertId = validateIntegerRange(alert.id, "alert.id", 1, 2_147_483_647);
    const occurrenceCount = validateIntegerRange(
      alert.occurrenceCount,
      "alert.occurrenceCount",
      1,
      2_147_483_647,
    );
    const result = await database
      .prepare(
        `UPDATE operational_alerts
         SET notified_occurrence_count = ?,
             last_notified_at = ?,
             updated_at = ?
         WHERE id = ?
           AND occurrence_count = ?
           AND notified_occurrence_count < ?`,
      )
      .bind(
        occurrenceCount,
        timestamp,
        timestamp,
        alertId,
        occurrenceCount,
        occurrenceCount,
      )
      .run();
    delivered += Number(result.meta?.changes ?? 0);
  }

  await database
    .prepare(
      `INSERT INTO audit_logs (
         actor_user_id, action, resource_type, resource_id,
         before_json, after_json, request_id, created_at
       ) VALUES (?, 'OPERATIONS_ALERT_NOTIFICATION_DELIVERED',
                 'OPERATIONS_NOTIFICATION', ?, NULL, ?, NULL, ?)`,
    )
    .bind(
      actorUserId,
      String(timestamp),
      JSON.stringify({
        delivered,
        attempted: input.alerts.length,
        alertIds: input.alerts.map((alert) => alert.id),
      }),
      timestamp,
    )
    .run();
  return delivered;
}

export function parseAllowedNotificationHosts(value: string): string[] {
  if (typeof value !== "string") {
    throw new TypeError("allowed notification hosts must be a string");
  }
  const hosts = value
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);
  if (!hosts.length) {
    throw new TypeError("at least one notification host is required");
  }
  const unique = new Set<string>();
  for (const host of hosts) {
    if (
      host !== host.toLocaleLowerCase("en-US") ||
      host.includes("/") ||
      host.includes(":") ||
      host.startsWith(".") ||
      host.endsWith(".") ||
      !/^[a-z0-9.-]+$/.test(host)
    ) {
      throw new TypeError(
        "notification hosts must be lowercase hostnames without ports or paths",
      );
    }
    unique.add(host);
  }
  return [...unique];
}

function parseAllowedWebhookUrl(
  value: string,
  allowedHosts: readonly string[],
): URL {
  if (typeof value !== "string" || !value || value.trim() !== value) {
    throw new TypeError("webhookUrl must be a non-empty, trimmed string");
  }
  if (!Array.isArray(allowedHosts) || !allowedHosts.length) {
    throw new TypeError("allowedHosts must contain at least one hostname");
  }
  const normalizedHosts = parseAllowedNotificationHosts(
    allowedHosts.join(","),
  );
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError("webhookUrl must be an absolute URL");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.hash ||
    !normalizedHosts.includes(url.hostname.toLocaleLowerCase("en-US"))
  ) {
    throw new TypeError(
      "webhookUrl must use an allowlisted HTTPS host without credentials or a fragment",
    );
  }
  return url;
}

async function requireAdmin(
  database: D1DatabaseLike,
  userId: string,
): Promise<void> {
  const user = await database
    .prepare("SELECT role, status FROM users WHERE id = ? LIMIT 1")
    .bind(userId)
    .first<{ role: string; status: string }>();
  if (!user || user.status !== "ACTIVE" || user.role !== "ADMIN") {
    throw new Error("An active administrator is required");
  }
}

function assertNotificationBatch(
  batch: OperationalNotificationBatch,
): void {
  if (
    !batch ||
    batch.schemaVersion !== "gli.operations-alerts.v1" ||
    !Number.isSafeInteger(batch.generatedAt) ||
    batch.generatedAt <= 0 ||
    !Array.isArray(batch.alerts) ||
    !batch.alerts.length ||
    batch.alerts.length > 50
  ) {
    throw new TypeError("notification batch is invalid");
  }
}

function optionalSecret(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (
    typeof value !== "string" ||
    value.trim() !== value ||
    value.length > 4_096
  ) {
    throw new TypeError(`${field} is invalid`);
  }
  return value;
}

function validateIdentifier(value: unknown, field: string): string {
  if (
    typeof value !== "string" ||
    !value ||
    value.trim() !== value ||
    value.length > 128 ||
    !/^[A-Za-z0-9._:-]+$/.test(value)
  ) {
    throw new TypeError(`${field} is invalid`);
  }
  return value;
}

function validateIntegerRange(
  value: unknown,
  field: string,
  minimum: number,
  maximum: number,
): number {
  if (
    !Number.isSafeInteger(value) ||
    (value as number) < minimum ||
    (value as number) > maximum
  ) {
    throw new RangeError(`${field} must be between ${minimum} and ${maximum}`);
  }
  return value as number;
}

function validateTimestamp(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new TypeError(`${field} must be a positive integer timestamp`);
  }
  return value as number;
}

function assertDatabase(
  database: D1DatabaseLike,
): asserts database is D1DatabaseLike {
  if (!database || typeof database.prepare !== "function") {
    throw new TypeError("database must expose prepare()");
  }
}
