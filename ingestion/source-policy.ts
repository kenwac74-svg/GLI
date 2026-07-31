export const SOURCE_APPROVAL_STATUSES = [
  "PENDING",
  "AUTHORIZATION_REQUIRED",
  "APPROVED",
  "SUSPENDED",
  "EXPIRED",
] as const;

export type SourceApprovalStatus =
  (typeof SOURCE_APPROVAL_STATUSES)[number];

export type SourcePolicy = {
  sourceSlug: string;
  approvalStatus: SourceApprovalStatus;
  permittedFields: readonly string[];
  approvalExpiresAt: string | null;
  connectorKind?: string;
  allowedHosts?: readonly string[];
  maxRecordsPerRun?: number;
  robotsAllowed?: boolean;
};

export type SourceConnector<T> = {
  sourceSlug: string;
  requestedFields: readonly string[];
  connectorKind?: string;
  endpoint?: string;
  collect: () => Promise<T>;
};

export type SourcePolicyDenialReason =
  | "SOURCE_MISMATCH"
  | "NOT_APPROVED"
  | "APPROVAL_EXPIRED"
  | "FIELD_NOT_PERMITTED"
  | "CONNECTOR_KIND_NOT_PERMITTED"
  | "ENDPOINT_NOT_PERMITTED";

export class SourcePolicyError extends Error {
  readonly sourceSlug: string;
  readonly reason: SourcePolicyDenialReason;

  constructor(
    sourceSlug: string,
    reason: SourcePolicyDenialReason,
    detail?: string,
  ) {
    super(
      `Collection blocked for source "${sourceSlug}": ${reason}${
        detail ? ` (${detail})` : ""
      }`,
    );
    this.name = "SourcePolicyError";
    this.sourceSlug = sourceSlug;
    this.reason = reason;
  }
}

function assertValidSlug(sourceSlug: string): void {
  if (!sourceSlug || sourceSlug.trim() !== sourceSlug) {
    throw new TypeError("sourceSlug must be a non-empty, trimmed string");
  }
}

function assertValidFields(
  fields: readonly string[],
  fieldName: string,
): void {
  if (!Array.isArray(fields)) {
    throw new TypeError(`${fieldName} must be an array`);
  }

  const uniqueFields = new Set<string>();
  for (const field of fields) {
    if (typeof field !== "string" || !field || field.trim() !== field) {
      throw new TypeError(
        `${fieldName} must contain only non-empty, trimmed strings`,
      );
    }
    if (uniqueFields.has(field)) {
      throw new TypeError(`${fieldName} must not contain duplicate fields`);
    }
    uniqueFields.add(field);
  }
}

function parseExpiry(expiry: string | null): number | null {
  if (expiry === null) {
    return null;
  }

  const timestamp = Date.parse(expiry);
  if (!Number.isFinite(timestamp)) {
    throw new TypeError("approvalExpiresAt must be a valid date-time or null");
  }
  return timestamp;
}

function normalizeAllowedHosts(hosts: readonly string[] | undefined): Set<string> {
  if (hosts === undefined) return new Set();
  assertValidFields(hosts, "allowedHosts");

  return new Set(
    hosts.map((host) => {
      const normalized = host.toLocaleLowerCase("en-US");
      if (
        normalized !== host ||
        normalized.includes("/") ||
        normalized.includes(":") ||
        normalized.startsWith(".") ||
        normalized.endsWith(".")
      ) {
        throw new TypeError(
          "allowedHosts must contain lowercase hostnames without ports or paths",
        );
      }
      return normalized;
    }),
  );
}

function parseEndpoint(endpoint: string | undefined): URL | null {
  if (endpoint === undefined) return null;
  if (typeof endpoint !== "string" || !endpoint || endpoint.trim() !== endpoint) {
    throw new TypeError("endpoint must be a non-empty, trimmed string");
  }

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new TypeError("endpoint must be an absolute URL");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.hash
  ) {
    throw new TypeError(
      "endpoint must use HTTPS and contain no credentials or fragment",
    );
  }
  return url;
}

export function assertSourceCollectionAllowed(
  connector: Pick<SourceConnector<unknown>, "sourceSlug" | "requestedFields">,
  policy: SourcePolicy,
  now: Date = new Date(),
): void {
  assertValidSlug(connector.sourceSlug);
  assertValidSlug(policy.sourceSlug);
  assertValidFields(connector.requestedFields, "requestedFields");
  assertValidFields(policy.permittedFields, "permittedFields");

  const nowTimestamp = now.getTime();
  if (!Number.isFinite(nowTimestamp)) {
    throw new TypeError("now must be a valid Date");
  }

  if (connector.sourceSlug !== policy.sourceSlug) {
    throw new SourcePolicyError(
      connector.sourceSlug,
      "SOURCE_MISMATCH",
      `policy belongs to ${policy.sourceSlug}`,
    );
  }

  // robots.txt governs technical crawling behavior; it is not authorization.
  if (policy.approvalStatus !== "APPROVED") {
    throw new SourcePolicyError(
      connector.sourceSlug,
      "NOT_APPROVED",
      policy.approvalStatus,
    );
  }

  const expiryTimestamp = parseExpiry(policy.approvalExpiresAt);
  if (expiryTimestamp !== null && expiryTimestamp <= nowTimestamp) {
    throw new SourcePolicyError(
      connector.sourceSlug,
      "APPROVAL_EXPIRED",
      policy.approvalExpiresAt ?? undefined,
    );
  }

  const permittedFields = new Set(policy.permittedFields);
  const deniedField = connector.requestedFields.find(
    (field) => !permittedFields.has(field),
  );
  if (deniedField) {
    throw new SourcePolicyError(
      connector.sourceSlug,
      "FIELD_NOT_PERMITTED",
      deniedField,
    );
  }

  if (
    policy.connectorKind &&
    connector.connectorKind !== policy.connectorKind
  ) {
    throw new SourcePolicyError(
      connector.sourceSlug,
      "CONNECTOR_KIND_NOT_PERMITTED",
      connector.connectorKind ?? "missing connector kind",
    );
  }

  if (
    policy.maxRecordsPerRun !== undefined &&
    (!Number.isInteger(policy.maxRecordsPerRun) ||
      policy.maxRecordsPerRun < 1 ||
      policy.maxRecordsPerRun > 1_000)
  ) {
    throw new TypeError(
      "maxRecordsPerRun must be an integer between 1 and 1000",
    );
  }

  const endpoint = parseEndpoint(connector.endpoint);
  const allowedHosts = normalizeAllowedHosts(policy.allowedHosts);
  if (endpoint && !allowedHosts.has(endpoint.hostname.toLocaleLowerCase("en-US"))) {
    throw new SourcePolicyError(
      connector.sourceSlug,
      "ENDPOINT_NOT_PERMITTED",
      endpoint.hostname,
    );
  }
}

export async function runApprovedSourceConnector<T>(
  connector: SourceConnector<T>,
  policy: SourcePolicy,
  now: Date = new Date(),
): Promise<T> {
  assertSourceCollectionAllowed(connector, policy, now);
  return connector.collect();
}
