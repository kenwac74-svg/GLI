import {
  getLatestAiEvaluationRun,
  type AiEvaluationRun,
} from "./ai-evaluation-runs.ts";
import { AI_EVALUATION_SUITE_VERSION } from "../lib/ai-evaluation.ts";
import type { D1DatabaseLike } from "./user-workflows.ts";

const DAY_MS = 24 * 60 * 60 * 1000;
const BACKUP_MAX_AGE_MS = 90 * DAY_MS;
const AI_EVALUATION_MAX_AGE_MS = 30 * DAY_MS;
const EVIDENCE_CAPTURE_MAX_AGE_MS = 365 * DAY_MS;

export const BACKUP_ENVIRONMENTS = ["STAGING", "PRODUCTION"] as const;
export const BACKUP_STORAGE_PROVIDERS = [
  "R2",
  "CLOUDFLARE_EXPORT",
  "OTHER",
] as const;
export const RESTORE_RESULTS = [
  "NOT_TESTED",
  "SUCCEEDED",
  "FAILED",
] as const;

export type BackupEnvironment = (typeof BACKUP_ENVIRONMENTS)[number];
export type BackupStorageProvider =
  (typeof BACKUP_STORAGE_PROVIDERS)[number];
export type RestoreResult = (typeof RESTORE_RESULTS)[number];
export type ReleaseGateStatus = "PASS" | "WARNING" | "BLOCKED";

export type BackupVerification = {
  id: number;
  environment: BackupEnvironment;
  storageProvider: BackupStorageProvider;
  objectKey: string;
  manifestSha256: string;
  capturedAt: number;
  restoreTestedAt: number | null;
  restoreResult: RestoreResult;
  recordCounts: Record<string, number>;
  verifiedByUserId: string;
  verifierName: string | null;
  notes: string | null;
  createdAt: number;
};

export type ReleaseGate = {
  id: string;
  group: "DATA" | "PRODUCT" | "OPERATIONS" | "GOVERNANCE";
  label: string;
  status: ReleaseGateStatus;
  evidence: string;
  nextAction: string | null;
};

export type ReleaseReadinessDashboard = {
  overall: ReleaseGateStatus;
  summary: {
    passed: number;
    warnings: number;
    blocked: number;
  };
  gates: ReleaseGate[];
  latestAiEvaluation: AiEvaluationRun | null;
  latestBackup: BackupVerification | null;
  humanApprovals: Array<{
    label: string;
    owner: string;
    status: "NEEDS_APPROVAL";
  }>;
};

type BackupRow = {
  id: number;
  environment: BackupEnvironment;
  storageProvider: BackupStorageProvider;
  objectKey: string;
  manifestSha256: string;
  capturedAt: number;
  restoreTestedAt: number | null;
  restoreResult: RestoreResult;
  recordCountsJson: string;
  verifiedByUserId: string;
  verifierName: string | null;
  notes: string | null;
  createdAt: number;
};

export async function getReleaseReadinessDashboard(
  database: D1DatabaseLike,
  actorUserId: string,
  runtime: {
    aiConfigured?: boolean;
    paymentConfigured?: boolean;
    schedulerConfigured?: boolean;
    now?: number;
  } = {},
): Promise<ReleaseReadinessDashboard> {
  assertDatabase(database);
  await requireAdmin(database, actorUserId);
  const now = validateNow(runtime.now);

  const [
    approvedExternalSources,
    recentExternalRuns,
    approvedTrustReports,
    openCriticalAlerts,
    deadLetters,
    failedPayments,
    overdueConsultations,
    activeAdmins,
    latestAiEvaluation,
    latestOpenAiEvaluation,
    latestBackup,
  ] = await Promise.all([
    count(
      database,
      `SELECT COUNT(*) AS value FROM sources
       WHERE approval_status = 'APPROVED'
         AND connector_kind NOT IN ('FIXTURE', 'DISABLED')
         AND (approval_expires_at IS NULL OR approval_expires_at > ?)`,
      now,
    ),
    count(
      database,
      `SELECT COUNT(*) AS value
       FROM ingestion_runs
       JOIN sources ON sources.id = ingestion_runs.source_id
       WHERE sources.connector_kind NOT IN ('FIXTURE', 'DISABLED')
         AND ingestion_runs.status IN ('SUCCEEDED', 'PARTIAL')
         AND ingestion_runs.started_at >= ?`,
      now - 7 * DAY_MS,
    ),
    count(
      database,
      `SELECT COUNT(DISTINCT listing_id) AS value
       FROM trust_score_runs
       WHERE approved_at IS NOT NULL`,
    ),
    count(
      database,
      `SELECT COUNT(*) AS value FROM operational_alerts
       WHERE status != 'RESOLVED' AND severity = 'CRITICAL'`,
    ),
    count(
      database,
      "SELECT COUNT(*) AS value FROM retry_jobs WHERE status = 'DEAD_LETTER'",
    ),
    count(
      database,
      "SELECT COUNT(*) AS value FROM payment_webhook_events WHERE status = 'FAILED'",
    ),
    count(
      database,
      `SELECT COUNT(*) AS value FROM consultations
       WHERE (status = 'RECEIVED' AND created_at < ?)
          OR (status = 'CONTACTED' AND updated_at < ?)`,
      now - DAY_MS,
      now - 2 * DAY_MS,
    ),
    count(
      database,
      `SELECT COUNT(*) AS value FROM users
       WHERE role = 'ADMIN' AND status = 'ACTIVE'`,
    ),
    getLatestAiEvaluationRun(database),
    getLatestAiEvaluationRun(database, "openai"),
    getLatestBackupVerification(database),
  ]);

  const gates: ReleaseGate[] = [
    gate(
      "external-source",
      "DATA",
      "외부 데이터 이용 승인",
      approvedExternalSources > 0 ? "PASS" : "BLOCKED",
      `운영 가능한 외부 소스 ${approvedExternalSources}개`,
      approvedExternalSources > 0
        ? null
        : "포털 또는 에이전시와 서면 이용 승인을 체결하세요.",
    ),
    gate(
      "external-collection",
      "DATA",
      "최근 외부 수집 증적",
      recentExternalRuns > 0
        ? "PASS"
        : approvedExternalSources > 0
          ? "WARNING"
          : "BLOCKED",
      `최근 7일 외부 수집 성공 ${recentExternalRuns}회`,
      recentExternalRuns > 0
        ? null
        : "승인된 외부 피드로 수집과 데이터 QA를 완료하세요.",
    ),
    gate(
      "trust-publication",
      "PRODUCT",
      "사람이 승인한 Trust Report",
      approvedTrustReports > 0 ? "PASS" : "BLOCKED",
      `승인된 Trust Report ${approvedTrustReports}건`,
      approvedTrustReports > 0
        ? null
        : "검증 담당자가 최소 1개 보고서를 승인해야 합니다.",
    ),
    aiEvaluationGate(
      "ai-runtime",
      "PRODUCT",
      "AI 상담 운영 설정",
      Boolean(runtime.aiConfigured),
      latestOpenAiEvaluation,
      now,
    ),
    booleanGate(
      "cash-payment",
      "PRODUCT",
      "현금 결제사 연결",
      Boolean(runtime.paymentConfigured),
      "실결제 어댑터와 서명 검증 설정",
      "결제사·환불 정책·웹훅 비밀값을 승인하세요.",
    ),
    gate(
      "critical-alerts",
      "OPERATIONS",
      "중대 운영 경보",
      openCriticalAlerts === 0 ? "PASS" : "BLOCKED",
      `미해결 중대 경보 ${openCriticalAlerts}건`,
      openCriticalAlerts === 0
        ? null
        : "중대 경보를 조사하고 해결 증적을 남기세요.",
    ),
    gate(
      "dead-letters",
      "OPERATIONS",
      "최종 실패 작업",
      deadLetters === 0 ? "PASS" : "BLOCKED",
      `Dead-letter ${deadLetters}건`,
      deadLetters === 0 ? null : "최종 실패 원인을 검토하고 재처리하세요.",
    ),
    gate(
      "payment-failures",
      "OPERATIONS",
      "결제 이벤트 오류",
      failedPayments === 0 ? "PASS" : "BLOCKED",
      `미처리 실패 이벤트 ${failedPayments}건`,
      failedPayments === 0
        ? null
        : "실패한 결제 이벤트를 대사하고 종결하세요.",
    ),
    gate(
      "consultation-sla",
      "OPERATIONS",
      "상담 응답 SLA",
      overdueConsultations === 0 ? "PASS" : "WARNING",
      `응답 지연 상담 ${overdueConsultations}건`,
      overdueConsultations === 0
        ? null
        : "지연 상담에 담당자를 지정하고 상태를 갱신하세요.",
    ),
    booleanGate(
      "scheduler",
      "OPERATIONS",
      "운영 스케줄러",
      Boolean(runtime.schedulerConfigured),
      "재시도·상태 점검·경보 전송 자동 실행",
      "운영 Worker 바인딩과 알림 목적지를 승인하세요.",
    ),
    gate(
      "admin-redundancy",
      "GOVERNANCE",
      "관리자 계정 이중화",
      activeAdmins >= 2 ? "PASS" : activeAdmins === 1 ? "WARNING" : "BLOCKED",
      `활성 관리자 ${activeAdmins}명`,
      activeAdmins >= 2
        ? null
        : "비상 대응을 위해 별도 실명 관리자 계정을 지정하세요.",
    ),
    backupGate(latestBackup, now),
  ];
  const summary = {
    passed: gates.filter((item) => item.status === "PASS").length,
    warnings: gates.filter((item) => item.status === "WARNING").length,
    blocked: gates.filter((item) => item.status === "BLOCKED").length,
  };

  return {
    overall:
      summary.blocked > 0
        ? "BLOCKED"
        : summary.warnings > 0
          ? "WARNING"
          : "PASS",
    summary,
    gates,
    latestAiEvaluation,
    latestBackup,
    humanApprovals: [
      {
        label: "외부 데이터 이용 계약",
        owner: "GLI Product Owner · Legal",
        status: "NEEDS_APPROVAL",
      },
      {
        label: "Trust Score 공개 문구",
        owner: "GLI Product Owner · Legal",
        status: "NEEDS_APPROVAL",
      },
      {
        label: "AI 상담 모델·품질 기준",
        owner: "GLI Product Owner · AI Review",
        status: "NEEDS_APPROVAL",
      },
      {
        label: "결제·환불 정책",
        owner: "Finance · Legal",
        status: "NEEDS_APPROVAL",
      },
      {
        label: "캄보디아 검증·상담 담당자",
        owner: "GLI Operations",
        status: "NEEDS_APPROVAL",
      },
    ],
  };
}

export async function recordBackupVerification(
  database: D1DatabaseLike,
  input: {
    environment: unknown;
    storageProvider: unknown;
    objectKey: unknown;
    manifestSha256: unknown;
    capturedAt: unknown;
    restoreTestedAt?: unknown;
    restoreResult: unknown;
    notes?: unknown;
  },
  actorUserId: string,
  options: {
    now?: number;
    requestId?: string | null;
  } = {},
): Promise<BackupVerification> {
  assertDatabase(database);
  await requireAdmin(database, actorUserId);
  const now = validateNow(options.now);
  const environment = validateEnum(
    input.environment,
    BACKUP_ENVIRONMENTS,
    "environment",
  );
  const storageProvider = validateEnum(
    input.storageProvider,
    BACKUP_STORAGE_PROVIDERS,
    "storageProvider",
  );
  const objectKey = validateObjectKey(input.objectKey);
  const manifestSha256 = validateSha256(input.manifestSha256);
  const capturedAt = validateEvidenceTimestamp(
    input.capturedAt,
    "capturedAt",
    now,
  );
  const restoreResult = validateEnum(
    input.restoreResult,
    RESTORE_RESULTS,
    "restoreResult",
  );
  const restoreTestedAt = validateRestoreTimestamp(
    input.restoreTestedAt,
    restoreResult,
    capturedAt,
    now,
  );
  const notes = validateNotes(input.notes);

  const existing = await database
    .prepare(
      `SELECT
         backup_verifications.id,
         backup_verifications.environment,
         backup_verifications.storage_provider AS storageProvider,
         backup_verifications.object_key AS objectKey,
         backup_verifications.manifest_sha256 AS manifestSha256,
         backup_verifications.captured_at AS capturedAt,
         backup_verifications.restore_tested_at AS restoreTestedAt,
         backup_verifications.restore_result AS restoreResult,
         backup_verifications.record_counts_json AS recordCountsJson,
         backup_verifications.verified_by_user_id AS verifiedByUserId,
         users.display_name AS verifierName,
         backup_verifications.notes,
         backup_verifications.created_at AS createdAt
       FROM backup_verifications
       LEFT JOIN users ON users.id = backup_verifications.verified_by_user_id
       WHERE object_key = ? AND manifest_sha256 = ?
       LIMIT 1`,
    )
    .bind(objectKey, manifestSha256)
    .first<BackupRow>();
  if (existing) return mapBackupRow(existing);

  const recordCounts = await collectRecordCounts(database);
  const insert = await database
    .prepare(
      `INSERT INTO backup_verifications (
         environment, storage_provider, object_key, manifest_sha256,
         captured_at, restore_tested_at, restore_result, record_counts_json,
         verified_by_user_id, notes, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      environment,
      storageProvider,
      objectKey,
      manifestSha256,
      capturedAt,
      restoreTestedAt,
      restoreResult,
      JSON.stringify(recordCounts),
      actorUserId,
      notes,
      now,
    )
    .run();
  if (insert.success === false) {
    throw new Error("Backup evidence write failed");
  }
  const row = await database
    .prepare(
      `SELECT
         backup_verifications.id,
         backup_verifications.environment,
         backup_verifications.storage_provider AS storageProvider,
         backup_verifications.object_key AS objectKey,
         backup_verifications.manifest_sha256 AS manifestSha256,
         backup_verifications.captured_at AS capturedAt,
         backup_verifications.restore_tested_at AS restoreTestedAt,
         backup_verifications.restore_result AS restoreResult,
         backup_verifications.record_counts_json AS recordCountsJson,
         backup_verifications.verified_by_user_id AS verifiedByUserId,
         users.display_name AS verifierName,
         backup_verifications.notes,
         backup_verifications.created_at AS createdAt
       FROM backup_verifications
       LEFT JOIN users ON users.id = backup_verifications.verified_by_user_id
       WHERE object_key = ? AND manifest_sha256 = ?
       LIMIT 1`,
    )
    .bind(objectKey, manifestSha256)
    .first<BackupRow>();
  if (!row) throw new Error("Backup evidence was not found after write");

  await database
    .prepare(
      `INSERT INTO audit_logs (
         actor_user_id, action, resource_type, resource_id,
         before_json, after_json, request_id, created_at
       ) VALUES (?, 'BACKUP_EVIDENCE_RECORDED', 'BACKUP_VERIFICATION', ?, NULL, ?, ?, ?)`,
    )
    .bind(
      actorUserId,
      String(row.id),
      JSON.stringify({
        environment,
        storageProvider,
        objectKey,
        manifestSha256,
        capturedAt,
        restoreTestedAt,
        restoreResult,
        recordCounts,
      }),
      normalizeRequestId(options.requestId),
      now,
    )
    .run();
  return mapBackupRow(row);
}

export async function getLatestBackupVerification(
  database: D1DatabaseLike,
): Promise<BackupVerification | null> {
  const row = await database
    .prepare(
      `SELECT
         backup_verifications.id,
         backup_verifications.environment,
         backup_verifications.storage_provider AS storageProvider,
         backup_verifications.object_key AS objectKey,
         backup_verifications.manifest_sha256 AS manifestSha256,
         backup_verifications.captured_at AS capturedAt,
         backup_verifications.restore_tested_at AS restoreTestedAt,
         backup_verifications.restore_result AS restoreResult,
         backup_verifications.record_counts_json AS recordCountsJson,
         backup_verifications.verified_by_user_id AS verifiedByUserId,
         users.display_name AS verifierName,
         backup_verifications.notes,
         backup_verifications.created_at AS createdAt
       FROM backup_verifications
       LEFT JOIN users ON users.id = backup_verifications.verified_by_user_id
       ORDER BY backup_verifications.created_at DESC,
                backup_verifications.id DESC
       LIMIT 1`,
    )
    .first<BackupRow>();
  return row ? mapBackupRow(row) : null;
}

function backupGate(
  evidence: BackupVerification | null,
  now: number,
): ReleaseGate {
  const succeeded =
    evidence?.environment === "PRODUCTION" &&
    evidence.restoreResult === "SUCCEEDED" &&
    evidence.restoreTestedAt !== null &&
    evidence.restoreTestedAt >= now - BACKUP_MAX_AGE_MS;
  const warning =
    evidence !== null &&
    evidence.restoreResult !== "FAILED" &&
    !succeeded;
  return gate(
    "backup-restore",
    "GOVERNANCE",
    "백업·복원 검증",
    succeeded ? "PASS" : warning ? "WARNING" : "BLOCKED",
    evidence
      ? `${evidence.environment} · ${evidence.restoreResult}`
      : "등록된 백업 증적 없음",
    succeeded
      ? null
      : "프로덕션 백업을 복원하고 90일 이내 성공 증적을 등록하세요.",
  );
}

function aiEvaluationGate(
  id: string,
  group: ReleaseGate["group"],
  label: string,
  configured: boolean,
  evaluation: AiEvaluationRun | null,
  now: number,
): ReleaseGate {
  if (!configured) {
    return gate(
      id,
      group,
      label,
      "BLOCKED",
      "서버 전용 AI 키와 모델 미설정",
      "호스팅 비밀값으로 AI 키를 등록한 뒤 실제 모델 평가를 실행하세요.",
    );
  }
  const current =
    evaluation?.requestedMode === "openai" &&
    evaluation.suiteVersion === AI_EVALUATION_SUITE_VERSION &&
    evaluation.status === "SUCCEEDED" &&
    evaluation.completedAt >= now - AI_EVALUATION_MAX_AGE_MS;
  return gate(
    id,
    group,
    label,
    current ? "PASS" : "BLOCKED",
    evaluation
      ? `${evaluation.requestedMode.toUpperCase()} · ${evaluation.passedCount}/${evaluation.totalCount} · ${evaluation.status}`
      : "등록된 실제 모델 평가 없음",
    current
      ? null
      : "현재 평가 묶음으로 실제 OpenAI 모델을 실행하고 30일 이내 성공 증적을 남기세요.",
  );
}

function gate(
  id: string,
  group: ReleaseGate["group"],
  label: string,
  status: ReleaseGateStatus,
  evidence: string,
  nextAction: string | null,
): ReleaseGate {
  return { id, group, label, status, evidence, nextAction };
}

function booleanGate(
  id: string,
  group: ReleaseGate["group"],
  label: string,
  ready: boolean,
  evidence: string,
  nextAction: string,
): ReleaseGate {
  return gate(
    id,
    group,
    label,
    ready ? "PASS" : "BLOCKED",
    ready ? `${evidence} 완료` : `${evidence} 미설정`,
    ready ? null : nextAction,
  );
}

async function collectRecordCounts(
  database: D1DatabaseLike,
): Promise<Record<string, number>> {
  const row = await database
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM users) AS users,
         (SELECT COUNT(*) FROM listings) AS listings,
         (SELECT COUNT(*) FROM listing_versions) AS listingVersions,
         (SELECT COUNT(*) FROM consultations) AS consultations,
         (SELECT COUNT(*) FROM memberships) AS memberships,
         (SELECT COUNT(*) FROM audit_logs) AS auditLogs`,
    )
    .first<Record<string, number>>();
  return {
    users: Number(row?.users ?? 0),
    listings: Number(row?.listings ?? 0),
    listingVersions: Number(row?.listingVersions ?? 0),
    consultations: Number(row?.consultations ?? 0),
    memberships: Number(row?.memberships ?? 0),
    auditLogs: Number(row?.auditLogs ?? 0),
  };
}

function mapBackupRow(row: BackupRow): BackupVerification {
  return {
    id: Number(row.id),
    environment: row.environment,
    storageProvider: row.storageProvider,
    objectKey: row.objectKey,
    manifestSha256: row.manifestSha256,
    capturedAt: Number(row.capturedAt),
    restoreTestedAt:
      row.restoreTestedAt == null ? null : Number(row.restoreTestedAt),
    restoreResult: row.restoreResult,
    recordCounts: parseRecordCounts(row.recordCountsJson),
    verifiedByUserId: row.verifiedByUserId,
    verifierName: row.verifierName,
    notes: row.notes,
    createdAt: Number(row.createdAt),
  };
}

function parseRecordCounts(value: string): Record<string, number> {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([, count]) => Number.isInteger(count) && Number(count) >= 0)
        .map(([key, count]) => [key, Number(count)]),
    );
  } catch {
    return {};
  }
}

function validateEnum<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  field: string,
): T[number] {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new RangeError(`${field} must be one of ${allowed.join(", ")}`);
  }
  return value;
}

function validateObjectKey(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length < 3 ||
    value.length > 256 ||
    !/^[A-Za-z0-9][A-Za-z0-9._/-]+$/.test(value) ||
    value.split("/").includes("..")
  ) {
    throw new TypeError("objectKey is invalid");
  }
  return value;
}

function validateSha256(value: unknown): string {
  if (typeof value !== "string" || !/^[a-fA-F0-9]{64}$/.test(value)) {
    throw new TypeError("manifestSha256 must be a 64-character SHA-256 hash");
  }
  return value.toLowerCase();
}

function validateEvidenceTimestamp(
  value: unknown,
  field: string,
  now: number,
): number {
  const timestamp = Number(value);
  if (
    !Number.isSafeInteger(timestamp) ||
    timestamp < now - EVIDENCE_CAPTURE_MAX_AGE_MS ||
    timestamp > now + 5 * 60 * 1000
  ) {
    throw new RangeError(`${field} is outside the allowed evidence window`);
  }
  return timestamp;
}

function validateRestoreTimestamp(
  value: unknown,
  result: RestoreResult,
  capturedAt: number,
  now: number,
): number | null {
  if (result === "NOT_TESTED") {
    if (value != null && value !== "") {
      throw new RangeError(
        "restoreTestedAt must be empty when restoreResult is NOT_TESTED",
      );
    }
    return null;
  }
  const timestamp = validateEvidenceTimestamp(value, "restoreTestedAt", now);
  if (timestamp < capturedAt) {
    throw new RangeError("restoreTestedAt cannot be before capturedAt");
  }
  return timestamp;
}

function validateNotes(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (
    typeof value !== "string" ||
    value.trim() !== value ||
    value.length > 500
  ) {
    throw new TypeError("notes must be a trimmed string up to 500 characters");
  }
  return value;
}

function validateNow(value: number | undefined): number {
  if (value == null) return Date.now();
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError("now must be a positive timestamp");
  }
  return value;
}

function normalizeRequestId(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!/^[A-Za-z0-9._:-]{1,128}$/.test(value)) {
    throw new TypeError("requestId is invalid");
  }
  return value;
}

async function requireAdmin(
  database: D1DatabaseLike,
  actorUserId: string,
): Promise<void> {
  if (typeof actorUserId !== "string" || !actorUserId) {
    throw new TypeError("actorUserId is required");
  }
  const user = await database
    .prepare("SELECT role, status FROM users WHERE id = ? LIMIT 1")
    .bind(actorUserId)
    .first<{ role: string; status: string }>();
  if (!user || user.role !== "ADMIN" || user.status !== "ACTIVE") {
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
