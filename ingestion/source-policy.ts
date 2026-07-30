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
  robotsAllowed?: boolean;
};

export type SourceConnector<T> = {
  sourceSlug: string;
  requestedFields: readonly string[];
  collect: () => Promise<T>;
};

export type SourcePolicyDenialReason =
  | "SOURCE_MISMATCH"
  | "NOT_APPROVED"
  | "APPROVAL_EXPIRED"
  | "FIELD_NOT_PERMITTED";

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
}

export async function runApprovedSourceConnector<T>(
  connector: SourceConnector<T>,
  policy: SourcePolicy,
  now: Date = new Date(),
): Promise<T> {
  assertSourceCollectionAllowed(connector, policy, now);
  return connector.collect();
}
