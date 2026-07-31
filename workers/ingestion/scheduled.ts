import {
  loadPendingOperationalNotificationBatch,
  markOperationalNotificationDelivered,
  parseAllowedNotificationHosts,
  sendOperationalNotificationBatch,
} from "../../db/operations-notifications.ts";
import { runOperationsHealthScan } from "../../db/operations-health.ts";
import type { D1DatabaseLike } from "../../db/user-workflows.ts";
import type { RawObjectStore } from "../../ingestion/contracts.ts";
import { executeNextLicensedFeedRetry } from "./index.ts";

export type ScheduledIngestionEnv = {
  DB: D1DatabaseLike;
  FILES: RawObjectStore;
  OPERATIONS_ACTOR_USER_ID: string;
  RETRY_JOBS_PER_TICK?: string;
  ALERT_WEBHOOK_URL?: string;
  ALERT_WEBHOOK_ALLOWED_HOSTS?: string;
  ALERT_WEBHOOK_BEARER?: string;
  [key: string]: unknown;
};

export type ScheduledOperationsResult = {
  retryJobs: {
    processed: number;
    succeeded: number;
    pending: number;
    deadLetters: number;
  };
  health: {
    activeAlerts: number;
    resolvedAlerts: number;
  };
  notification: {
    status: "NO_CHANGES" | "PENDING_CONFIGURATION" | "DELIVERED";
    delivered: number;
  };
};

type ScheduledControllerLike = {
  scheduledTime: number;
};

type ExecutionContextLike = {
  waitUntil(promise: Promise<unknown>): void;
};

export async function runScheduledOperations(
  env: ScheduledIngestionEnv,
  scheduledAt = new Date(),
  fetchImpl: typeof fetch = fetch,
): Promise<ScheduledOperationsResult> {
  assertEnvironment(env);
  const timestamp = scheduledAt.getTime();
  if (!Number.isSafeInteger(timestamp) || timestamp <= 0) {
    throw new TypeError("scheduledAt must be a valid Date");
  }
  const retryLimit = parseRetryLimit(env.RETRY_JOBS_PER_TICK);
  const retryJobs = {
    processed: 0,
    succeeded: 0,
    pending: 0,
    deadLetters: 0,
  };
  const dependencies = {
    database: env.DB,
    rawStore: env.FILES,
    secrets: sourceSecrets(env),
    fetchImpl,
    now: () => scheduledAt,
  };

  for (let index = 0; index < retryLimit; index += 1) {
    const retry = await executeNextLicensedFeedRetry(
      dependencies,
      timestamp,
    );
    if (!retry) break;
    retryJobs.processed += 1;
    if (retry.status === "SUCCEEDED") retryJobs.succeeded += 1;
    if (retry.status === "PENDING") retryJobs.pending += 1;
    if (retry.status === "DEAD_LETTER") retryJobs.deadLetters += 1;
  }

  const health = await runOperationsHealthScan(
    env.DB,
    env.OPERATIONS_ACTOR_USER_ID,
    timestamp,
  );
  const batch = await loadPendingOperationalNotificationBatch(
    env.DB,
    timestamp,
  );
  if (!batch) {
    return {
      retryJobs,
      health,
      notification: { status: "NO_CHANGES", delivered: 0 },
    };
  }
  if (!env.ALERT_WEBHOOK_URL) {
    return {
      retryJobs,
      health,
      notification: { status: "PENDING_CONFIGURATION", delivered: 0 },
    };
  }

  const allowedHosts = parseAllowedNotificationHosts(
    requiredString(
      env.ALERT_WEBHOOK_ALLOWED_HOSTS,
      "ALERT_WEBHOOK_ALLOWED_HOSTS",
    ),
  );
  await sendOperationalNotificationBatch(batch, {
    webhookUrl: env.ALERT_WEBHOOK_URL,
    allowedHosts,
    bearerToken: env.ALERT_WEBHOOK_BEARER,
    fetchImpl,
  });
  const delivered = await markOperationalNotificationDelivered(
    env.DB,
    {
      actorUserId: env.OPERATIONS_ACTOR_USER_ID,
      alerts: batch.alerts,
    },
    timestamp,
  );
  return {
    retryJobs,
    health,
    notification: { status: "DELIVERED", delivered },
  };
}

const scheduledWorker = {
  scheduled(
    controller: ScheduledControllerLike,
    env: ScheduledIngestionEnv,
    context: ExecutionContextLike,
  ): void {
    context.waitUntil(
      runScheduledOperations(env, new Date(controller.scheduledTime)),
    );
  },
};

export default scheduledWorker;

function sourceSecrets(env: ScheduledIngestionEnv): Record<string, string> {
  return Object.fromEntries(
    Object.entries(env).filter(
      ([key, value]) =>
        key.startsWith("SOURCE_SECRET_") && typeof value === "string",
    ),
  ) as Record<string, string>;
}

function parseRetryLimit(value: unknown): number {
  if (value === undefined || value === null || value === "") return 3;
  if (typeof value !== "string" || !/^[1-9][0-9]*$/.test(value)) {
    throw new TypeError("RETRY_JOBS_PER_TICK must be an integer string");
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 10) {
    throw new RangeError("RETRY_JOBS_PER_TICK must be between 1 and 10");
  }
  return parsed;
}

function requiredString(value: unknown, field: string): string {
  if (
    typeof value !== "string" ||
    !value ||
    value.trim() !== value ||
    value.length > 4_096
  ) {
    throw new TypeError(`${field} must be a non-empty, trimmed string`);
  }
  return value;
}

function assertEnvironment(
  env: ScheduledIngestionEnv,
): asserts env is ScheduledIngestionEnv {
  if (!env || typeof env !== "object") {
    throw new TypeError("worker environment is required");
  }
  if (!env.DB || typeof env.DB.prepare !== "function") {
    throw new TypeError("D1 binding DB is required");
  }
  if (!env.FILES || typeof env.FILES.put !== "function") {
    throw new TypeError("R2 binding FILES is required");
  }
  requiredString(env.OPERATIONS_ACTOR_USER_ID, "OPERATIONS_ACTOR_USER_ID");
}
