import type {
  AiEvaluationCaseResult,
  AiEvaluationMode,
  AiEvaluationStatus,
  AiSearchEvaluation,
} from "../lib/ai-evaluation.ts";
import type { D1DatabaseLike } from "./user-workflows.ts";

export type AiEvaluationRun = {
  id: string;
  suiteVersion: string;
  requestedMode: AiEvaluationMode;
  model: string | null;
  status: AiEvaluationStatus;
  passedCount: number;
  totalCount: number;
  cases: AiEvaluationCaseResult[];
  startedAt: number;
  completedAt: number;
  executedByUserId: string;
  executorName: string | null;
  createdAt: number;
};

type AiEvaluationRow = Omit<AiEvaluationRun, "cases"> & {
  casesJson: string;
};

export async function recordAiEvaluationRun(
  database: D1DatabaseLike,
  evaluation: AiSearchEvaluation,
  actorUserId: string,
  options: { requestId?: string | null; now?: number } = {},
): Promise<AiEvaluationRun> {
  await requireAdmin(database, actorUserId);
  validateEvaluation(evaluation);
  const now = options.now ?? Date.now();
  if (!Number.isSafeInteger(now) || now < evaluation.completedAt) {
    throw new RangeError("AI evaluation record time is invalid");
  }
  const id = `aie_${crypto.randomUUID()}`;
  const insert = await database
    .prepare(
      `INSERT INTO ai_evaluation_runs (
         id, suite_version, requested_mode, model, status,
         passed_count, total_count, cases_json, started_at, completed_at,
         executed_by_user_id, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      evaluation.suiteVersion,
      evaluation.requestedMode,
      evaluation.model,
      evaluation.status,
      evaluation.passedCount,
      evaluation.totalCount,
      JSON.stringify(evaluation.cases),
      evaluation.startedAt,
      evaluation.completedAt,
      actorUserId,
      now,
    )
    .run();
  if (insert.success === false) {
    throw new Error("AI evaluation evidence write failed");
  }

  await database
    .prepare(
      `INSERT INTO audit_logs (
         actor_user_id, action, resource_type, resource_id,
         before_json, after_json, request_id, created_at
       ) VALUES (?, 'AI_EVALUATION_RECORDED', 'AI_EVALUATION_RUN', ?, NULL, ?, ?, ?)`,
    )
    .bind(
      actorUserId,
      id,
      JSON.stringify({
        suiteVersion: evaluation.suiteVersion,
        requestedMode: evaluation.requestedMode,
        model: evaluation.model,
        status: evaluation.status,
        passedCount: evaluation.passedCount,
        totalCount: evaluation.totalCount,
      }),
      normalizeRequestId(options.requestId),
      now,
    )
    .run();

  const saved = await getAiEvaluationRun(database, id);
  if (!saved) throw new Error("AI evaluation evidence was not found after write");
  return saved;
}

export async function getLatestAiEvaluationRun(
  database: D1DatabaseLike,
  requestedMode?: AiEvaluationMode,
): Promise<AiEvaluationRun | null> {
  const statement = database.prepare(
    `${AI_EVALUATION_SELECT}
       ${requestedMode ? "WHERE ai_evaluation_runs.requested_mode = ?" : ""}
       ORDER BY ai_evaluation_runs.completed_at DESC,
                ai_evaluation_runs.id DESC
       LIMIT 1`,
  );
  const row = await (requestedMode
    ? statement.bind(requestedMode)
    : statement
  ).first<AiEvaluationRow>();
  return row ? mapRow(row) : null;
}

async function getAiEvaluationRun(
  database: D1DatabaseLike,
  id: string,
): Promise<AiEvaluationRun | null> {
  const row = await database
    .prepare(`${AI_EVALUATION_SELECT} WHERE ai_evaluation_runs.id = ? LIMIT 1`)
    .bind(id)
    .first<AiEvaluationRow>();
  return row ? mapRow(row) : null;
}

const AI_EVALUATION_SELECT = `SELECT
  ai_evaluation_runs.id,
  ai_evaluation_runs.suite_version AS suiteVersion,
  ai_evaluation_runs.requested_mode AS requestedMode,
  ai_evaluation_runs.model,
  ai_evaluation_runs.status,
  ai_evaluation_runs.passed_count AS passedCount,
  ai_evaluation_runs.total_count AS totalCount,
  ai_evaluation_runs.cases_json AS casesJson,
  ai_evaluation_runs.started_at AS startedAt,
  ai_evaluation_runs.completed_at AS completedAt,
  ai_evaluation_runs.executed_by_user_id AS executedByUserId,
  users.display_name AS executorName,
  ai_evaluation_runs.created_at AS createdAt
FROM ai_evaluation_runs
LEFT JOIN users ON users.id = ai_evaluation_runs.executed_by_user_id`;

function mapRow(row: AiEvaluationRow): AiEvaluationRun {
  return {
    id: row.id,
    suiteVersion: row.suiteVersion,
    requestedMode: row.requestedMode,
    model: row.model,
    status: row.status,
    passedCount: Number(row.passedCount),
    totalCount: Number(row.totalCount),
    cases: parseCases(row.casesJson),
    startedAt: Number(row.startedAt),
    completedAt: Number(row.completedAt),
    executedByUserId: row.executedByUserId,
    executorName: row.executorName,
    createdAt: Number(row.createdAt),
  };
}

function parseCases(value: string): AiEvaluationCaseResult[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as AiEvaluationCaseResult[]) : [];
  } catch {
    return [];
  }
}

function validateEvaluation(evaluation: AiSearchEvaluation): void {
  if (
    !evaluation ||
    typeof evaluation.suiteVersion !== "string" ||
    !["rules", "openai"].includes(evaluation.requestedMode) ||
    !["SUCCEEDED", "FAILED"].includes(evaluation.status) ||
    !Number.isInteger(evaluation.passedCount) ||
    !Number.isInteger(evaluation.totalCount) ||
    evaluation.totalCount < 1 ||
    evaluation.passedCount < 0 ||
    evaluation.passedCount > evaluation.totalCount ||
    evaluation.cases.length !== evaluation.totalCount ||
    !Number.isSafeInteger(evaluation.startedAt) ||
    !Number.isSafeInteger(evaluation.completedAt) ||
    evaluation.completedAt < evaluation.startedAt
  ) {
    throw new TypeError("AI evaluation evidence is invalid");
  }
}

async function requireAdmin(
  database: D1DatabaseLike,
  actorUserId: string,
): Promise<void> {
  const user = await database
    .prepare("SELECT role, status FROM users WHERE id = ? LIMIT 1")
    .bind(actorUserId)
    .first<{ role: string; status: string }>();
  if (!user || user.role !== "ADMIN" || user.status !== "ACTIVE") {
    throw new Error("An active administrator is required");
  }
}

function normalizeRequestId(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!/^[A-Za-z0-9._:-]{1,128}$/.test(value)) {
    throw new TypeError("requestId is invalid");
  }
  return value;
}
