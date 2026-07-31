import {
  getSourceConnectorConfiguration,
  runApprovedConnectorIngestion,
  type IngestionResult,
} from "../../db/operations.ts";
import type { D1DatabaseLike } from "../../db/user-workflows.ts";
import type { RawObjectStore } from "../../ingestion/contracts.ts";
import {
  createLicensedJsonFeedConnector,
  LICENSED_JSON_CONNECTOR_KIND,
} from "../../ingestion/licensed-json-feed.ts";

export type LicensedFeedJob = {
  sourceSlug: string;
  actorUserId: string;
};

export type LicensedFeedJobDependencies = {
  database: D1DatabaseLike;
  rawStore: RawObjectStore;
  secrets?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  now?: () => Date;
};

export async function executeLicensedFeedJob(
  job: LicensedFeedJob,
  dependencies: LicensedFeedJobDependencies,
): Promise<IngestionResult> {
  assertJob(job);
  const configuration = await getSourceConnectorConfiguration(
    dependencies.database,
    job.sourceSlug,
  );
  if (configuration.connectorKind !== LICENSED_JSON_CONNECTOR_KIND) {
    throw new Error(
      `Source ${job.sourceSlug} is not configured for a licensed JSON feed`,
    );
  }

  const feedUrl = requiredString(
    configuration.connectorConfig.feedUrl,
    "connectorConfig.feedUrl",
  );
  const authorizationSecretName = optionalString(
    configuration.connectorConfig.authorizationSecretName,
    "connectorConfig.authorizationSecretName",
  );
  const authorizationHeader = authorizationSecretName
    ? requiredString(
        dependencies.secrets?.[authorizationSecretName],
        `secret ${authorizationSecretName}`,
      )
    : undefined;
  const executedAt = dependencies.now?.() ?? new Date();

  const connector = createLicensedJsonFeedConnector({
    sourceSlug: job.sourceSlug,
    feedUrl,
    allowedHosts: configuration.policy.allowedHosts ?? [],
    maxRecords: configuration.policy.maxRecordsPerRun ?? 100,
    rawStore: dependencies.rawStore,
    authorizationHeader,
    fetchImpl: dependencies.fetchImpl,
    now: () => executedAt,
  });

  return runApprovedConnectorIngestion(
    dependencies.database,
    connector,
    job.actorUserId,
    executedAt,
  );
}

function assertJob(job: LicensedFeedJob): void {
  if (!job || typeof job !== "object") {
    throw new TypeError("job is required");
  }
  for (const [field, value] of Object.entries({
    sourceSlug: job.sourceSlug,
    actorUserId: job.actorUserId,
  })) {
    if (typeof value !== "string" || !value || value.trim() !== value) {
      throw new TypeError(`${field} must be a non-empty, trimmed string`);
    }
  }
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value || value.trim() !== value) {
    throw new TypeError(`${field} must be a non-empty, trimmed string`);
  }
  return value;
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return requiredString(value, field);
}
