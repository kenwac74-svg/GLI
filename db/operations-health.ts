import type { D1DatabaseLike } from "./user-workflows.ts";

const SOURCE_EXPIRY_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const CONSULTATION_RECEIVED_LIMIT_MS = 24 * 60 * 60 * 1000;
const CONSULTATION_CONTACTED_LIMIT_MS = 48 * 60 * 60 * 1000;
const LISTING_STALE_LIMIT_MS = 14 * 24 * 60 * 60 * 1000;
const FAILURE_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

export const OPERATIONAL_ALERT_STATUSES = [
  "OPEN",
  "ACKNOWLEDGED",
  "RESOLVED",
] as const;

export type OperationalAlertStatus =
  (typeof OPERATIONAL_ALERT_STATUSES)[number];

export type OperationalAlert = {
  id: number;
  dedupeKey: string;
  origin: string;
  category: string;
  severity: string;
  status: OperationalAlertStatus;
  title: string;
  detail: string;
  resourceType: string | null;
  resourceId: string | null;
  occurrenceCount: number;
  firstSeenAt: number;
  lastSeenAt: number;
  acknowledgedAt: number | null;
  resolvedAt: number | null;
};

export type RetryJob = {
  id: number;
  dedupeKey: string;
  jobType: string;
  payloadJson: string;
  status: string;
  attemptCount: number;
  maxAttempts: number;
  availableAt: number;
  claimedAt: number | null;
  completedAt: number | null;
  lastError: string | null;
  createdAt: number;
  updatedAt: number;
};

export type IngestionRetryPayload = {
  sourceSlug: string;
  actorUserId: string;
  failedRunId: number;
};

export type OperationsHealthDashboard = {
  metrics: {
    openCritical: number;
    openWarnings: number;
    pendingRetries: number;
    deadLetters: number;
    pendingNotifications: number;
  };
  alerts: OperationalAlert[];
  retryJobs: RetryJob[];
};

type AlertSpec = {
  dedupeKey: string;
  category: string;
  severity: "WARNING" | "CRITICAL";
  title: string;
  detail: string;
  resourceType: string;
  resourceId: string;
};

export async function getOperationsHealthDashboard(
  database: D1DatabaseLike,
): Promise<OperationsHealthDashboard> {
  assertDatabase(database);
  const [
    openCritical,
    openWarnings,
    pendingRetries,
    deadLetters,
    pendingNotifications,
    alerts,
    retryJobs,
  ] = await Promise.all([
      count(
        database,
        `SELECT COUNT(*) AS value FROM operational_alerts
         WHERE status != 'RESOLVED' AND severity = 'CRITICAL'`,
      ),
      count(
        database,
        `SELECT COUNT(*) AS value FROM operational_alerts
         WHERE status != 'RESOLVED' AND severity = 'WARNING'`,
      ),
      count(
        database,
        `SELECT COUNT(*) AS value FROM retry_jobs
         WHERE status IN ('PENDING', 'RUNNING')`,
      ),
      count(
        database,
        "SELECT COUNT(*) AS value FROM retry_jobs WHERE status = 'DEAD_LETTER'",
      ),
      count(
        database,
        `SELECT COUNT(*) AS value FROM operational_alerts
         WHERE status != 'RESOLVED'
           AND occurrence_count > notified_occurrence_count`,
      ),
      database
        .prepare(
          `SELECT
             id,
             dedupe_key AS dedupeKey,
             origin,
             category,
             severity,
             status,
             title,
             detail,
             resource_type AS resourceType,
             resource_id AS resourceId,
             occurrence_count AS occurrenceCount,
             first_seen_at AS firstSeenAt,
             last_seen_at AS lastSeenAt,
             acknowledged_at AS acknowledgedAt,
             resolved_at AS resolvedAt
           FROM operational_alerts
           ORDER BY
             CASE status WHEN 'OPEN' THEN 0 WHEN 'ACKNOWLEDGED' THEN 1 ELSE 2 END,
             CASE severity WHEN 'CRITICAL' THEN 0 ELSE 1 END,
             last_seen_at DESC
           LIMIT 30`,
        )
        .all<OperationalAlert>(),
      database
        .prepare(
          `SELECT
             id,
             dedupe_key AS dedupeKey,
             job_type AS jobType,
             payload_json AS payloadJson,
             status,
             attempt_count AS attemptCount,
             max_attempts AS maxAttempts,
             available_at AS availableAt,
             claimed_at AS claimedAt,
             completed_at AS completedAt,
             last_error AS lastError,
             created_at AS createdAt,
             updated_at AS updatedAt
           FROM retry_jobs
           ORDER BY
             CASE status
               WHEN 'DEAD_LETTER' THEN 0
               WHEN 'RUNNING' THEN 1
               WHEN 'PENDING' THEN 2
               ELSE 3
             END,
             updated_at DESC
           LIMIT 20`,
        )
        .all<RetryJob>(),
    ]);

  return {
    metrics: {
      openCritical,
      openWarnings,
      pendingRetries,
      deadLetters,
      pendingNotifications,
    },
    alerts: alerts.results ?? [],
    retryJobs: retryJobs.results ?? [],
  };
}

export async function runOperationsHealthScan(
  database: D1DatabaseLike,
  actorUserId: string,
  now = Date.now(),
): Promise<{ activeAlerts: number; resolvedAlerts: number }> {
  assertDatabase(database);
  const actor = validateIdentifier(actorUserId, "actorUserId");
  const timestamp = validateTimestamp(now, "now");
  await requireAdmin(database, actor);

  const [
    expiringSources,
    failedRuns,
    failedPayments,
    delayedConsultations,
    staleListings,
  ] = await Promise.all([
    database
      .prepare(
        `SELECT slug, name_internal AS nameInternal,
                approval_expires_at AS approvalExpiresAt
         FROM sources
         WHERE approval_status = 'APPROVED'
           AND approval_expires_at IS NOT NULL
           AND approval_expires_at <= ?
         ORDER BY approval_expires_at ASC`,
      )
      .bind(timestamp + SOURCE_EXPIRY_WINDOW_MS)
      .all<{
        slug: string;
        nameInternal: string;
        approvalExpiresAt: number;
      }>(),
    database
      .prepare(
        `SELECT ir.id, ir.status, ir.error_summary AS errorSummary, s.slug
         FROM ingestion_runs ir
         JOIN sources s ON s.id = ir.source_id
         WHERE ir.status IN ('FAILED', 'PARTIAL')
           AND ir.started_at >= ?
           AND NOT EXISTS (
             SELECT 1
             FROM retry_jobs rj
             WHERE rj.job_type = 'LICENSED_FEED'
               AND rj.status = 'SUCCEEDED'
               AND CAST(
                 json_extract(rj.payload_json, '$.failedRunId') AS INTEGER
               ) = ir.id
           )
         ORDER BY ir.started_at DESC
         LIMIT 50`,
      )
      .bind(timestamp - FAILURE_LOOKBACK_MS)
      .all<{
        id: number;
        status: string;
        errorSummary: string | null;
        slug: string;
      }>(),
    database
      .prepare(
        `SELECT id, provider, provider_event_id AS providerEventId,
                error_summary AS errorSummary
         FROM payment_webhook_events
         WHERE status = 'FAILED' AND received_at >= ?
         ORDER BY received_at DESC
         LIMIT 50`,
      )
      .bind(timestamp - FAILURE_LOOKBACK_MS)
      .all<{
        id: number;
        provider: string;
        providerEventId: string;
        errorSummary: string | null;
      }>(),
    database
      .prepare(
        `SELECT id, status, updated_at AS updatedAt
         FROM consultations
         WHERE (status = 'RECEIVED' AND updated_at <= ?)
            OR (status = 'CONTACTED' AND updated_at <= ?)
         ORDER BY updated_at ASC
         LIMIT 50`,
      )
      .bind(
        timestamp - CONSULTATION_RECEIVED_LIMIT_MS,
        timestamp - CONSULTATION_CONTACTED_LIMIT_MS,
      )
      .all<{ id: string; status: string; updatedAt: number }>(),
    database
      .prepare(
        `SELECT COUNT(*) AS count, MIN(last_seen_at) AS oldestSeenAt
         FROM listings
         WHERE status = 'ACTIVE' AND last_seen_at <= ?`,
      )
      .bind(timestamp - LISTING_STALE_LIMIT_MS)
      .first<{ count: number; oldestSeenAt: number | null }>(),
  ]);

  const specs: AlertSpec[] = [];
  for (const source of expiringSources.results ?? []) {
    specs.push({
      dedupeKey: `health:source-expiry:${source.slug}:${source.approvalExpiresAt}`,
      category: "SOURCE_APPROVAL",
      severity: source.approvalExpiresAt <= timestamp ? "CRITICAL" : "WARNING",
      title:
        source.approvalExpiresAt <= timestamp
          ? "데이터 소스 승인이 만료되었습니다"
          : "데이터 소스 승인이 곧 만료됩니다",
      detail: `${source.nameInternal} 승인 만료일을 갱신해야 합니다.`,
      resourceType: "SOURCE",
      resourceId: source.slug,
    });
  }
  for (const run of failedRuns.results ?? []) {
    specs.push({
      dedupeKey: `health:ingestion-run:${run.id}`,
      category: "INGESTION",
      severity: run.status === "FAILED" ? "CRITICAL" : "WARNING",
      title:
        run.status === "FAILED"
          ? "수집 실행이 실패했습니다"
          : "수집 결과를 검토해야 합니다",
      detail: `${run.slug} · ${boundedDetail(run.errorSummary ?? run.status)}`,
      resourceType: "INGESTION_RUN",
      resourceId: String(run.id),
    });
  }
  for (const event of failedPayments.results ?? []) {
    specs.push({
      dedupeKey: `health:payment-event:${event.id}`,
      category: "PAYMENT",
      severity: "CRITICAL",
      title: "결제 이벤트 처리가 실패했습니다",
      detail: `${event.provider} · ${boundedDetail(
        event.errorSummary ?? event.providerEventId,
      )}`,
      resourceType: "PAYMENT_EVENT",
      resourceId: String(event.id),
    });
  }
  for (const consultation of delayedConsultations.results ?? []) {
    specs.push({
      dedupeKey: `health:consultation-delay:${consultation.id}:${consultation.status}`,
      category: "CONSULTATION",
      severity: "WARNING",
      title: "상담 응답 시간이 지연되고 있습니다",
      detail: `${consultation.status} 상태의 상담을 확인해야 합니다.`,
      resourceType: "CONSULTATION",
      resourceId: consultation.id,
    });
  }
  if (Number(staleListings?.count ?? 0) > 0) {
    specs.push({
      dedupeKey: `health:stale-active-listings:${staleListings?.oldestSeenAt ?? 0}`,
      category: "DATA_FRESHNESS",
      severity: "WARNING",
      title: "갱신이 필요한 게시 자산이 있습니다",
      detail: `${Number(staleListings?.count ?? 0)}개 자산이 14일 이상 갱신되지 않았습니다.`,
      resourceType: "LISTING_SET",
      resourceId: "stale-active",
    });
  }

  for (const spec of specs) {
    await upsertAlert(database, { ...spec, origin: "HEALTH_SCAN" }, timestamp);
  }

  const activeKeys = new Set(specs.map((spec) => spec.dedupeKey));
  const current = await database
    .prepare(
      `SELECT id, dedupe_key AS dedupeKey
       FROM operational_alerts
       WHERE origin = 'HEALTH_SCAN' AND status != 'RESOLVED'`,
    )
    .all<{ id: number; dedupeKey: string }>();
  let resolvedAlerts = 0;
  for (const alert of current.results ?? []) {
    if (activeKeys.has(alert.dedupeKey)) continue;
    await database
      .prepare(
        `UPDATE operational_alerts
         SET status = 'RESOLVED', resolved_at = ?, updated_at = ?
         WHERE id = ? AND status != 'RESOLVED'`,
      )
      .bind(timestamp, timestamp, alert.id)
      .run();
    resolvedAlerts += 1;
  }

  await insertAudit(database, {
    actorUserId: actor,
    action: "OPERATIONS_HEALTH_SCAN_COMPLETED",
    resourceType: "OPERATIONS_HEALTH",
    resourceId: String(timestamp),
    after: { activeAlerts: specs.length, resolvedAlerts },
    createdAt: timestamp,
  });
  return { activeAlerts: specs.length, resolvedAlerts };
}

export async function updateOperationalAlert(
  database: D1DatabaseLike,
  input: {
    alertId: number;
    status: "ACKNOWLEDGED" | "RESOLVED";
    actorUserId: string;
  },
  now = Date.now(),
): Promise<OperationalAlert> {
  assertDatabase(database);
  const alertId = validatePositiveInteger(input.alertId, "alertId");
  const actor = validateIdentifier(input.actorUserId, "actorUserId");
  const timestamp = validateTimestamp(now, "now");
  await requireAdmin(database, actor);
  if (input.status !== "ACKNOWLEDGED" && input.status !== "RESOLVED") {
    throw new RangeError("status must be ACKNOWLEDGED or RESOLVED");
  }

  const before = await getAlert(database, alertId);
  if (!before) throw new Error("Operational alert was not found");
  if (before.status === "RESOLVED") return before;

  await database
    .prepare(
      `UPDATE operational_alerts
       SET status = ?, acknowledged_by_user_id = ?,
           acknowledged_at = COALESCE(acknowledged_at, ?),
           resolved_at = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      input.status,
      actor,
      timestamp,
      input.status === "RESOLVED" ? timestamp : null,
      timestamp,
      alertId,
    )
    .run();
  await insertAudit(database, {
    actorUserId: actor,
    action:
      input.status === "RESOLVED"
        ? "OPERATIONAL_ALERT_RESOLVED"
        : "OPERATIONAL_ALERT_ACKNOWLEDGED",
    resourceType: "OPERATIONAL_ALERT",
    resourceId: String(alertId),
    before: { status: before.status },
    after: { status: input.status },
    createdAt: timestamp,
  });

  const updated = await getAlert(database, alertId);
  if (!updated) throw new Error("Operational alert disappeared after update");
  return updated;
}

export async function enqueueIngestionRetry(
  database: D1DatabaseLike,
  input: {
    sourceSlug: string;
    actorUserId: string;
    failedRunId: number;
    error: string;
    maxAttempts?: number;
  },
  now = Date.now(),
): Promise<RetryJob> {
  assertDatabase(database);
  const sourceSlug = validateIdentifier(input.sourceSlug, "sourceSlug");
  const actorUserId = validateIdentifier(input.actorUserId, "actorUserId");
  const failedRunId = validatePositiveInteger(input.failedRunId, "failedRunId");
  const timestamp = validateTimestamp(now, "now");
  const maxAttempts =
    input.maxAttempts === undefined
      ? 3
      : validateRange(input.maxAttempts, "maxAttempts", 1, 10);
  const error = boundedDetail(input.error);
  const dedupeKey = `ingestion-run:${failedRunId}`;
  const payload = {
    sourceSlug,
    actorUserId,
    failedRunId,
  } satisfies IngestionRetryPayload;

  await database
    .prepare(
      `INSERT OR IGNORE INTO retry_jobs (
         dedupe_key, job_type, payload_json, status, attempt_count,
         max_attempts, available_at, claimed_at, completed_at,
         last_error, created_at, updated_at
       ) VALUES (?, 'LICENSED_FEED', ?, 'PENDING', 0, ?, ?, NULL, NULL, ?, ?, ?)`,
    )
    .bind(
      dedupeKey,
      JSON.stringify(payload),
      maxAttempts,
      timestamp,
      error,
      timestamp,
      timestamp,
    )
    .run();
  const job = await getRetryJobByDedupe(database, dedupeKey);
  if (!job) throw new Error("Failed to enqueue ingestion retry");
  await upsertAlert(
    database,
    {
      dedupeKey: `worker:retry-job:${job.id}`,
      origin: "WORKER",
      category: "INGESTION_RETRY",
      severity: "WARNING",
      title: "수집 재시도가 예약되었습니다",
      detail: `${sourceSlug} · ${error}`,
      resourceType: "RETRY_JOB",
      resourceId: String(job.id),
    },
    timestamp,
  );
  return job;
}

export async function claimNextIngestionRetry(
  database: D1DatabaseLike,
  now = Date.now(),
): Promise<(RetryJob & { payload: IngestionRetryPayload }) | null> {
  assertDatabase(database);
  const timestamp = validateTimestamp(now, "now");
  const candidate = await database
    .prepare(
      `SELECT
         id, dedupe_key AS dedupeKey, job_type AS jobType,
         payload_json AS payloadJson, status,
         attempt_count AS attemptCount, max_attempts AS maxAttempts,
         available_at AS availableAt, claimed_at AS claimedAt,
         completed_at AS completedAt, last_error AS lastError,
         created_at AS createdAt, updated_at AS updatedAt
       FROM retry_jobs
       WHERE job_type = 'LICENSED_FEED'
         AND status = 'PENDING' AND available_at <= ?
       ORDER BY available_at ASC, id ASC
       LIMIT 1`,
    )
    .bind(timestamp)
    .first<RetryJob>();
  if (!candidate) return null;

  const claimResult = await database
    .prepare(
      `UPDATE retry_jobs
       SET status = 'RUNNING', attempt_count = attempt_count + 1,
           claimed_at = ?, updated_at = ?
       WHERE id = ? AND status = 'PENDING'`,
    )
    .bind(timestamp, timestamp, candidate.id)
    .run();
  if (Number(claimResult.meta?.changes ?? 0) !== 1) return null;
  const claimed = await getRetryJob(database, candidate.id);
  if (
    !claimed ||
    claimed.status !== "RUNNING" ||
    claimed.claimedAt !== timestamp ||
    claimed.attemptCount !== candidate.attemptCount + 1
  ) {
    return null;
  }
  return { ...claimed, payload: parseRetryPayload(claimed.payloadJson) };
}

export async function completeRetryJob(
  database: D1DatabaseLike,
  retryJobId: number,
  now = Date.now(),
): Promise<RetryJob> {
  assertDatabase(database);
  const id = validatePositiveInteger(retryJobId, "retryJobId");
  const timestamp = validateTimestamp(now, "now");
  const job = await getRetryJob(database, id);
  if (!job) throw new Error("Retry job was not found");
  if (job.status === "SUCCEEDED") return job;
  if (job.status !== "RUNNING") {
    throw new Error("Only a running retry job can complete");
  }

  await database
    .prepare(
      `UPDATE retry_jobs
       SET status = 'SUCCEEDED', completed_at = ?,
           last_error = NULL, updated_at = ?
       WHERE id = ? AND status = 'RUNNING'`,
    )
    .bind(timestamp, timestamp, id)
    .run();
  await resolveAlertByDedupe(database, `worker:retry-job:${id}`, timestamp);
  const updated = await getRetryJob(database, id);
  if (!updated) throw new Error("Retry job disappeared after completion");
  return updated;
}

export async function failRetryJob(
  database: D1DatabaseLike,
  retryJobId: number,
  error: string,
  now = Date.now(),
): Promise<RetryJob> {
  assertDatabase(database);
  const id = validatePositiveInteger(retryJobId, "retryJobId");
  const timestamp = validateTimestamp(now, "now");
  const job = await getRetryJob(database, id);
  if (!job) throw new Error("Retry job was not found");
  if (job.status !== "RUNNING") {
    throw new Error("Only a running retry job can fail");
  }
  const detail = boundedDetail(error);
  const deadLetter = job.attemptCount >= job.maxAttempts;
  const delayMs = Math.min(
    60 * 60 * 1000,
    60_000 * 2 ** Math.max(0, job.attemptCount - 1),
  );

  await database
    .prepare(
      `UPDATE retry_jobs
       SET status = ?, available_at = ?, claimed_at = NULL,
           last_error = ?, updated_at = ?
       WHERE id = ? AND status = 'RUNNING'`,
    )
    .bind(
      deadLetter ? "DEAD_LETTER" : "PENDING",
      deadLetter ? timestamp : timestamp + delayMs,
      detail,
      timestamp,
      id,
    )
    .run();
  await upsertAlert(
    database,
    {
      dedupeKey: `worker:retry-job:${id}`,
      origin: "WORKER",
      category: "INGESTION_RETRY",
      severity: deadLetter ? "CRITICAL" : "WARNING",
      title: deadLetter
        ? "수집 재시도가 최종 실패로 격리되었습니다"
        : "수집 재시도가 다시 예약되었습니다",
      detail,
      resourceType: "RETRY_JOB",
      resourceId: String(id),
    },
    timestamp,
  );
  const updated = await getRetryJob(database, id);
  if (!updated) throw new Error("Retry job disappeared after failure");
  return updated;
}

export async function latestFailedIngestionRunId(
  database: D1DatabaseLike,
  sourceSlug: string,
): Promise<number | null> {
  assertDatabase(database);
  const slug = validateIdentifier(sourceSlug, "sourceSlug");
  const row = await database
    .prepare(
      `SELECT ir.id
       FROM ingestion_runs ir
       JOIN sources s ON s.id = ir.source_id
       WHERE s.slug = ? AND ir.status = 'FAILED'
       ORDER BY ir.id DESC
       LIMIT 1`,
    )
    .bind(slug)
    .first<{ id: number }>();
  return row?.id ?? null;
}

async function upsertAlert(
  database: D1DatabaseLike,
  input: AlertSpec & { origin: "HEALTH_SCAN" | "WORKER" },
  now: number,
): Promise<void> {
  await database
    .prepare(
      `INSERT INTO operational_alerts (
         dedupe_key, origin, category, severity, status,
         title, detail, resource_type, resource_id, occurrence_count,
         first_seen_at, last_seen_at, acknowledged_by_user_id,
         acknowledged_at, resolved_at, created_at, updated_at
       ) VALUES (?, ?, ?, ?, 'OPEN', ?, ?, ?, ?, 1, ?, ?, NULL, NULL, NULL, ?, ?)
       ON CONFLICT(dedupe_key) DO UPDATE SET
         category = excluded.category,
         severity = excluded.severity,
         title = excluded.title,
         detail = excluded.detail,
         resource_type = excluded.resource_type,
         resource_id = excluded.resource_id,
         status = operational_alerts.status,
         occurrence_count = CASE
           WHEN operational_alerts.status = 'RESOLVED'
             THEN operational_alerts.occurrence_count
           WHEN operational_alerts.severity != excluded.severity
             OR operational_alerts.title != excluded.title
             OR operational_alerts.detail != excluded.detail
             THEN operational_alerts.occurrence_count + 1
           ELSE operational_alerts.occurrence_count
         END,
         last_seen_at = excluded.last_seen_at,
         acknowledged_by_user_id = operational_alerts.acknowledged_by_user_id,
         acknowledged_at = operational_alerts.acknowledged_at,
         resolved_at = operational_alerts.resolved_at,
         updated_at = excluded.updated_at`,
    )
    .bind(
      input.dedupeKey,
      input.origin,
      input.category,
      input.severity,
      input.title,
      input.detail,
      input.resourceType,
      input.resourceId,
      now,
      now,
      now,
      now,
    )
    .run();
}

async function resolveAlertByDedupe(
  database: D1DatabaseLike,
  dedupeKey: string,
  now: number,
): Promise<void> {
  await database
    .prepare(
      `UPDATE operational_alerts
       SET status = 'RESOLVED', resolved_at = ?, updated_at = ?
       WHERE dedupe_key = ? AND status != 'RESOLVED'`,
    )
    .bind(now, now, dedupeKey)
    .run();
}

async function getAlert(
  database: D1DatabaseLike,
  id: number,
): Promise<OperationalAlert | null> {
  return database
    .prepare(
      `SELECT
         id, dedupe_key AS dedupeKey, origin, category, severity, status,
         title, detail, resource_type AS resourceType,
         resource_id AS resourceId, occurrence_count AS occurrenceCount,
         first_seen_at AS firstSeenAt, last_seen_at AS lastSeenAt,
         acknowledged_at AS acknowledgedAt, resolved_at AS resolvedAt
       FROM operational_alerts WHERE id = ?`,
    )
    .bind(id)
    .first<OperationalAlert>();
}

async function getRetryJob(
  database: D1DatabaseLike,
  id: number,
): Promise<RetryJob | null> {
  return database
    .prepare(
      `SELECT
         id, dedupe_key AS dedupeKey, job_type AS jobType,
         payload_json AS payloadJson, status,
         attempt_count AS attemptCount, max_attempts AS maxAttempts,
         available_at AS availableAt, claimed_at AS claimedAt,
         completed_at AS completedAt, last_error AS lastError,
         created_at AS createdAt, updated_at AS updatedAt
       FROM retry_jobs WHERE id = ?`,
    )
    .bind(id)
    .first<RetryJob>();
}

async function getRetryJobByDedupe(
  database: D1DatabaseLike,
  dedupeKey: string,
): Promise<RetryJob | null> {
  return database
    .prepare(
      `SELECT
         id, dedupe_key AS dedupeKey, job_type AS jobType,
         payload_json AS payloadJson, status,
         attempt_count AS attemptCount, max_attempts AS maxAttempts,
         available_at AS availableAt, claimed_at AS claimedAt,
         completed_at AS completedAt, last_error AS lastError,
         created_at AS createdAt, updated_at AS updatedAt
       FROM retry_jobs WHERE dedupe_key = ?`,
    )
    .bind(dedupeKey)
    .first<RetryJob>();
}

function parseRetryPayload(value: string): IngestionRetryPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("Retry job payload is invalid");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Retry job payload is invalid");
  }
  const candidate = parsed as Record<string, unknown>;
  return {
    sourceSlug: validateIdentifier(candidate.sourceSlug, "sourceSlug"),
    actorUserId: validateIdentifier(candidate.actorUserId, "actorUserId"),
    failedRunId: validatePositiveInteger(candidate.failedRunId, "failedRunId"),
  };
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

async function count(
  database: D1DatabaseLike,
  sql: string,
): Promise<number> {
  const row = await database.prepare(sql).first<{ value: number }>();
  return Number(row?.value ?? 0);
}

async function insertAudit(
  database: D1DatabaseLike,
  event: {
    actorUserId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    before?: unknown;
    after?: unknown;
    createdAt: number;
  },
): Promise<void> {
  await database
    .prepare(
      `INSERT INTO audit_logs (
         actor_user_id, action, resource_type, resource_id,
         before_json, after_json, request_id, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`,
    )
    .bind(
      event.actorUserId,
      event.action,
      event.resourceType,
      event.resourceId,
      event.before === undefined ? null : JSON.stringify(event.before),
      event.after === undefined ? null : JSON.stringify(event.after),
      event.createdAt,
    )
    .run();
}

function boundedDetail(value: unknown): string {
  if (typeof value !== "string") return "상세 오류가 제공되지 않았습니다.";
  const normalized = value.trim().replace(/\s+/g, " ");
  return (normalized || "상세 오류가 제공되지 않았습니다.").slice(0, 2_000);
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

function validatePositiveInteger(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throw new TypeError(`${field} must be a positive integer`);
  }
  return value as number;
}

function validateRange(
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
