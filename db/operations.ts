import {
  normalizeApprovedFixture,
  type NormalizationInput,
  type NormalizedListing,
} from "../ingestion/normalize.ts";
import type {
  CollectedListingBatch,
  RawSnapshotMetadata,
} from "../ingestion/contracts.ts";
import {
  assertSourceCollectionAllowed,
  type SourceConnector,
  type SourcePolicy,
} from "../ingestion/source-policy.ts";
import {
  LICENSED_JSON_CONNECTOR_KIND,
  LICENSED_JSON_REQUESTED_FIELDS,
} from "../ingestion/licensed-json-feed.ts";
import { calculateTrustScore, type ReviewStatus } from "../lib/trust.ts";
import type {
  D1DatabaseLike,
  D1StatementLike,
} from "./user-workflows.ts";

const TRUST_RULE_VERSION = "trust-v0.2-operations";

export type OperationsSource = {
  id: number;
  slug: string;
  nameInternal: string;
  country: string;
  approvalStatus: string;
  connectorKind: string;
  connectorStatus: "READY" | "APPROVAL_REQUIRED" | "CONFIGURATION_REQUIRED";
  approvalExpiresAt: number | null;
  updatedAt: number;
};

export type OperationsRun = {
  id: number;
  sourceSlug: string;
  status: string;
  startedAt: number;
  endedAt: number | null;
  discoveredCount: number;
  acceptedCount: number;
  rejectedCount: number;
  errorSummary: string | null;
};

export type IngestionExecutionOptions = {
  demoAutoApproval?: boolean;
};

export type OperationsListing = {
  publicId: string;
  title: string;
  city: string;
  district: string | null;
  status: string;
  trustScore: number;
  trustStatus: string;
  approvedAt: number | null;
  updatedAt: number;
};

export type OperationsDashboard = {
  metrics: {
    approvedSources: number;
    reviewPending: number;
    publishedTrustReports: number;
    openConsultations: number;
  };
  sources: OperationsSource[];
  runs: OperationsRun[];
  listings: OperationsListing[];
};

export type IngestionResult = {
  runId: number;
  status: "SUCCEEDED" | "PARTIAL";
  discoveredCount: number;
  acceptedCount: number;
  rejectedCount: number;
  listingPublicIds: string[];
  errors: string[];
};

export type ReviewAction = "PUBLISH" | "HOLD";

export type ListingReviewChecklist = {
  sourceRightsConfirmed: boolean;
  factsCrossChecked: boolean;
  publicCopyReviewed: boolean;
  limitationsRecorded: boolean;
};

export type ListingReviewEvidence = ListingReviewChecklist & {
  note: string;
};

export type ListingReviewDetail = {
  listing: {
    id: number;
    publicId: string;
    title: string;
    summary: string;
    country: string;
    city: string;
    district: string | null;
    transactionType: string;
    propertyType: string;
    priceMinor: number;
    currency: string;
    areaSqmX100: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    status: string;
    updatedAt: number;
  };
  trust: {
    id: number;
    score: number;
    status: string;
    ruleVersion: string;
    dimensions: Record<string, unknown>;
    explanation: string;
    calculatedAt: number;
    approvedByUserId: string | null;
    approvedAt: number | null;
  } | null;
  sources: Array<{
    slug: string;
    nameInternal: string;
    approvalStatus: string;
    sourceUrl: string;
    firstSeenAt: number;
    lastSeenAt: number;
  }>;
  latestVersion: {
    id: number;
    normalizedPayload: Record<string, unknown>;
    changedFields: unknown[];
    observedAt: number;
    rawObjectKey: string | null;
    rawContentHash: string | null;
    rawFetchedAt: number | null;
  } | null;
  decisions: Array<{
    id: number;
    action: ReviewAction;
    reviewerUserId: string;
    reviewerName: string;
    checklist: ListingReviewChecklist;
    note: string;
    createdAt: number;
  }>;
};

export type SourceConnectorConfiguration = {
  sourceSlug: string;
  nameInternal: string;
  country: string;
  connectorKind: string;
  connectorConfig: Record<string, unknown>;
  policy: SourcePolicy;
};

export type SourceManagementDetail = {
  id: number;
  slug: string;
  nameInternal: string;
  country: string;
  baseUrl: string;
  policyUrl: string | null;
  approvalStatus: string;
  approvalReference: string | null;
  approvedAt: number | null;
  approvalExpiresAt: number | null;
  policyReviewedAt: number | null;
  connectorKind: string;
  feedUrl: string | null;
  authorizationSecretName: string | null;
  allowedHosts: string[];
  permittedFields: string[];
  maxRecordsPerRun: number;
  updatedAt: number;
};

type SourceRow = {
  id: number;
  slug: string;
  nameInternal: string;
  country: string;
  baseUrl: string;
  policyUrl: string | null;
  approvalStatus: string;
  approvalReference: string | null;
  approvedAt: number | null;
  approvedByUserId: string | null;
  policyReviewedAt: number | null;
  permittedFieldsJson: string;
  connectorKind: string;
  connectorConfigJson: string;
  allowedHostsJson: string;
  maxRecordsPerRun: number;
  approvalExpiresAt: number | null;
  updatedAt: number;
};

type SourceDashboardRow = Omit<OperationsSource, "connectorStatus">;

type ListingIdentityRow = {
  id: number;
  publicId: string;
  status: string;
};

export async function getOperationsDashboard(
  database: D1DatabaseLike,
): Promise<OperationsDashboard> {
  assertDatabase(database);

  const [
    approvedSources,
    reviewPending,
    publishedTrustReports,
    openConsultations,
    sourceRows,
    runRows,
    listingRows,
  ] = await Promise.all([
    count(
      database,
      `SELECT COUNT(*) AS value
       FROM sources
       WHERE approval_status = 'APPROVED'
         AND (approval_expires_at IS NULL OR approval_expires_at > ?)`,
      Date.now(),
    ),
    count(
      database,
      "SELECT COUNT(*) AS value FROM listings WHERE status = 'REVIEW_PENDING'",
    ),
    count(
      database,
      `SELECT COUNT(DISTINCT listing_id) AS value
       FROM trust_score_runs
       WHERE approved_at IS NOT NULL`,
    ),
    count(
      database,
      `SELECT COUNT(*) AS value
       FROM consultations
       WHERE status IN ('RECEIVED', 'CONTACTED', 'SCHEDULED')`,
    ),
    database
      .prepare(
        `SELECT
           id,
           slug,
           name_internal AS nameInternal,
           country,
           approval_status AS approvalStatus,
           connector_kind AS connectorKind,
           approval_expires_at AS approvalExpiresAt,
           updated_at AS updatedAt
         FROM sources
         ORDER BY country ASC, name_internal ASC`,
      )
      .all<SourceDashboardRow>(),
    database
      .prepare(
        `SELECT
           ir.id,
           s.slug AS sourceSlug,
           ir.status,
           ir.started_at AS startedAt,
           ir.ended_at AS endedAt,
           ir.discovered_count AS discoveredCount,
           ir.accepted_count AS acceptedCount,
           ir.rejected_count AS rejectedCount,
           ir.error_summary AS errorSummary
         FROM ingestion_runs ir
         JOIN sources s ON s.id = ir.source_id
         ORDER BY ir.started_at DESC
         LIMIT 10`,
      )
      .all<OperationsRun>(),
    database
      .prepare(
        `SELECT
           l.public_id AS publicId,
           l.title,
           l.city,
           l.district,
           l.status,
           COALESCE(ts.score, 0) AS trustScore,
           COALESCE(ts.status, 'PRELIMINARY') AS trustStatus,
           ts.approved_at AS approvedAt,
           l.updated_at AS updatedAt
         FROM listings l
         LEFT JOIN trust_score_runs ts
           ON ts.id = (
             SELECT inner_ts.id
             FROM trust_score_runs inner_ts
             WHERE inner_ts.listing_id = l.id
             ORDER BY inner_ts.calculated_at DESC, inner_ts.id DESC
             LIMIT 1
           )
         WHERE l.status IN ('REVIEW_PENDING', 'HELD', 'ACTIVE')
         ORDER BY
           CASE l.status
             WHEN 'REVIEW_PENDING' THEN 0
             WHEN 'HELD' THEN 1
             ELSE 2
           END,
           l.updated_at DESC
         LIMIT 30`,
      )
      .all<OperationsListing>(),
  ]);

  return {
    metrics: {
      approvedSources,
      reviewPending,
      publishedTrustReports,
      openConsultations,
    },
    sources: (sourceRows.results ?? []).map((source) => ({
      ...source,
      connectorStatus: connectorStatus(source),
    })),
    runs: runRows.results ?? [],
    listings: listingRows.results ?? [],
  };
}

export async function getListingReviewDetail(
  database: D1DatabaseLike,
  publicId: string,
  actorUserId: string,
): Promise<ListingReviewDetail | null> {
  assertDatabase(database);
  validateListingPublicId(publicId);
  await requireAdmin(database, actorUserId);

  const listing = await database
    .prepare(
      `SELECT
         l.id,
         l.public_id AS publicId,
         l.title,
         l.summary,
         l.country,
         l.city,
         l.district,
         l.transaction_type AS transactionType,
         l.property_type AS propertyType,
         l.price_minor AS priceMinor,
         l.currency,
         l.area_sqm_x100 AS areaSqmX100,
         l.bedrooms,
         l.bathrooms,
         l.status,
         l.updated_at AS updatedAt
       FROM listings l
       WHERE l.public_id = ?
       LIMIT 1`,
    )
    .bind(publicId)
    .first<ListingReviewDetail["listing"]>();
  if (!listing) return null;

  const [trust, sources, latestVersion, decisions] = await Promise.all([
    database
      .prepare(
        `SELECT
           id,
           score,
           status,
           rule_version AS ruleVersion,
           dimensions_json AS dimensionsJson,
           explanation,
           calculated_at AS calculatedAt,
           approved_by_user_id AS approvedByUserId,
           approved_at AS approvedAt
         FROM trust_score_runs
         WHERE listing_id = ?
         ORDER BY calculated_at DESC, id DESC
         LIMIT 1`,
      )
      .bind(listing.id)
      .first<{
        id: number;
        score: number;
        status: string;
        ruleVersion: string;
        dimensionsJson: string;
        explanation: string;
        calculatedAt: number;
        approvedByUserId: string | null;
        approvedAt: number | null;
      }>(),
    database
      .prepare(
        `SELECT
           s.slug,
           s.name_internal AS nameInternal,
           s.approval_status AS approvalStatus,
           ls.source_url AS sourceUrl,
           ls.first_seen_at AS firstSeenAt,
           ls.last_seen_at AS lastSeenAt
         FROM listing_sources ls
         JOIN sources s ON s.id = ls.source_id
         WHERE ls.listing_id = ?
         ORDER BY s.name_internal ASC`,
      )
      .bind(listing.id)
      .all<ListingReviewDetail["sources"][number]>(),
    database
      .prepare(
        `SELECT
           lv.id,
           lv.normalized_payload_json AS normalizedPayloadJson,
           lv.changed_fields_json AS changedFieldsJson,
           lv.observed_at AS observedAt,
           rs.object_key AS rawObjectKey,
           rs.content_hash AS rawContentHash,
           rs.fetched_at AS rawFetchedAt
         FROM listing_versions lv
         LEFT JOIN raw_snapshots rs ON rs.id = lv.raw_snapshot_id
         WHERE lv.listing_id = ?
         ORDER BY lv.observed_at DESC, lv.id DESC
         LIMIT 1`,
      )
      .bind(listing.id)
      .first<{
        id: number;
        normalizedPayloadJson: string;
        changedFieldsJson: string;
        observedAt: number;
        rawObjectKey: string | null;
        rawContentHash: string | null;
        rawFetchedAt: number | null;
      }>(),
    database
      .prepare(
        `SELECT
           d.id,
           d.action,
           d.reviewer_user_id AS reviewerUserId,
           COALESCE(u.display_name, u.email, d.reviewer_user_id) AS reviewerName,
           d.checklist_json AS checklistJson,
           d.note,
           d.created_at AS createdAt
         FROM listing_review_decisions d
         LEFT JOIN users u ON u.id = d.reviewer_user_id
         WHERE d.listing_id = ?
         ORDER BY d.created_at DESC, d.id DESC
         LIMIT 20`,
      )
      .bind(listing.id)
      .all<{
        id: number;
        action: ReviewAction;
        reviewerUserId: string;
        reviewerName: string;
        checklistJson: string;
        note: string;
        createdAt: number;
      }>(),
  ]);

  return {
    listing,
    trust: trust
      ? {
          id: trust.id,
          score: trust.score,
          status: trust.status,
          ruleVersion: trust.ruleVersion,
          dimensions: parseJsonRecord(trust.dimensionsJson),
          explanation: trust.explanation,
          calculatedAt: trust.calculatedAt,
          approvedByUserId: trust.approvedByUserId,
          approvedAt: trust.approvedAt,
        }
      : null,
    sources: sources.results ?? [],
    latestVersion: latestVersion
      ? {
          id: latestVersion.id,
          normalizedPayload: parseJsonRecord(
            latestVersion.normalizedPayloadJson,
          ),
          changedFields: parseJsonArray(latestVersion.changedFieldsJson),
          observedAt: latestVersion.observedAt,
          rawObjectKey: latestVersion.rawObjectKey,
          rawContentHash: latestVersion.rawContentHash,
          rawFetchedAt: latestVersion.rawFetchedAt,
        }
      : null,
    decisions: (decisions.results ?? []).map((decision) => ({
      id: decision.id,
      action: decision.action,
      reviewerUserId: decision.reviewerUserId,
      reviewerName: decision.reviewerName,
      checklist: parseReviewChecklist(decision.checklistJson),
      note: decision.note,
      createdAt: decision.createdAt,
    })),
  };
}

export async function runApprovedFixtureIngestion(
  database: D1DatabaseLike,
  sourceSlug: string,
  requestedFields: readonly string[],
  candidates: readonly NormalizationInput[],
  actorUserId: string,
  now = new Date(),
  options: IngestionExecutionOptions = {},
): Promise<IngestionResult> {
  return runApprovedConnectorIngestion(
    database,
    {
      sourceSlug,
      connectorKind: "FIXTURE",
      requestedFields,
      collect: async () => ({ candidates }),
    },
    actorUserId,
    now,
    options,
  );
}

export async function getSourceConnectorConfiguration(
  database: D1DatabaseLike,
  sourceSlug: string,
): Promise<SourceConnectorConfiguration> {
  assertDatabase(database);
  const source = await loadSourceRow(database, sourceSlug);
  return {
    sourceSlug: source.slug,
    nameInternal: source.nameInternal,
    country: source.country,
    connectorKind: source.connectorKind,
    connectorConfig: parseObjectJson(
      source.connectorConfigJson,
      `Source ${source.slug} has invalid connector configuration`,
    ),
    policy: sourcePolicy(source),
  };
}

export async function getSourceManagementDetail(
  database: D1DatabaseLike,
  sourceSlug: string,
  actorUserId: string,
): Promise<SourceManagementDetail> {
  assertDatabase(database);
  const actor = validateIdentifier(actorUserId, "actorUserId");
  await requireAdmin(database, actor);
  return sourceManagementDetail(await loadSourceRow(database, sourceSlug));
}

export async function configureLicensedSource(
  database: D1DatabaseLike,
  input: {
    sourceSlug: string;
    approvalReference: string;
    approvalExpiresAt: number | null;
    feedUrl: string;
    authorizationSecretName?: string | null;
    maxRecordsPerRun: number;
  },
  actorUserId: string,
  now = Date.now(),
): Promise<SourceManagementDetail> {
  assertDatabase(database);
  const actor = validateIdentifier(actorUserId, "actorUserId");
  const timestamp = validateTimestamp(now, "now");
  await requireAdmin(database, actor);
  const source = await loadSourceRow(
    database,
    validateSourceSlug(input.sourceSlug),
  );
  const approvalReference = validateText(
    input.approvalReference,
    "approvalReference",
    6,
    500,
  );
  const approvalExpiresAt = validateApprovalExpiry(
    input.approvalExpiresAt,
    timestamp,
  );
  const feedUrl = validateFeedUrl(input.feedUrl);
  const authorizationSecretName = validateSourceSecretName(
    input.authorizationSecretName,
  );
  const maxRecordsPerRun = validateIntegerRange(
    input.maxRecordsPerRun,
    "maxRecordsPerRun",
    1,
    1_000,
  );
  const before = sourceManagementDetail(source);
  const connectorConfig = {
    feedUrl: feedUrl.toString(),
    ...(authorizationSecretName
      ? { authorizationSecretName }
      : {}),
  };

  await database
    .prepare(
      `UPDATE sources
       SET approval_status = 'APPROVED',
           permitted_fields_json = ?,
           approved_at = ?,
           approval_expires_at = ?,
           connector_kind = ?,
           connector_config_json = ?,
           allowed_hosts_json = ?,
           max_records_per_run = ?,
           approval_reference = ?,
           approved_by_user_id = ?,
           policy_reviewed_at = ?,
           updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      JSON.stringify(LICENSED_JSON_REQUESTED_FIELDS),
      timestamp,
      approvalExpiresAt,
      LICENSED_JSON_CONNECTOR_KIND,
      JSON.stringify(connectorConfig),
      JSON.stringify([feedUrl.hostname.toLocaleLowerCase("en-US")]),
      maxRecordsPerRun,
      approvalReference,
      actor,
      timestamp,
      timestamp,
      source.id,
    )
    .run();

  const after = sourceManagementDetail(
    await loadSourceRow(database, source.slug),
  );
  await insertAudit(database, {
    actorUserId: actor,
    action: "SOURCE_CONNECTOR_APPROVED",
    resourceType: "SOURCE",
    resourceId: source.slug,
    before: sourceAuditView(before),
    after: sourceAuditView(after),
    createdAt: timestamp,
  });
  return after;
}

export async function suspendSourceConnector(
  database: D1DatabaseLike,
  sourceSlug: string,
  actorUserId: string,
  now = Date.now(),
): Promise<SourceManagementDetail> {
  assertDatabase(database);
  const actor = validateIdentifier(actorUserId, "actorUserId");
  const timestamp = validateTimestamp(now, "now");
  await requireAdmin(database, actor);
  const source = await loadSourceRow(
    database,
    validateSourceSlug(sourceSlug),
  );
  const before = sourceManagementDetail(source);
  if (source.approvalStatus !== "SUSPENDED") {
    await database
      .prepare(
        `UPDATE sources
         SET approval_status = 'SUSPENDED', updated_at = ?
         WHERE id = ?`,
      )
      .bind(timestamp, source.id)
      .run();
    await insertAudit(database, {
      actorUserId: actor,
      action: "SOURCE_CONNECTOR_SUSPENDED",
      resourceType: "SOURCE",
      resourceId: source.slug,
      before: sourceAuditView(before),
      after: { approvalStatus: "SUSPENDED" },
      createdAt: timestamp,
    });
  }
  return sourceManagementDetail(await loadSourceRow(database, source.slug));
}

export async function runApprovedConnectorIngestion(
  database: D1DatabaseLike,
  connector: SourceConnector<CollectedListingBatch>,
  actorUserId: string,
  now = new Date(),
  options: IngestionExecutionOptions = {},
): Promise<IngestionResult> {
  assertDatabase(database);
  const source = await loadSourceRow(database, connector.sourceSlug);
  const configuredPolicy = sourcePolicy(source);
  // DEMO-ONLY EXCEPTION: the hosted product simulation may treat a configured
  // source as approved and publish its records immediately. Production must
  // omit this option and retain source authorization plus human listing review.
  const demoAutoApproval = options.demoAutoApproval === true;
  const policy: SourcePolicy = demoAutoApproval
    ? {
        ...configuredPolicy,
        approvalStatus: "APPROVED",
        approvalExpiresAt: null,
      }
    : configuredPolicy;
  assertSourceCollectionAllowed(connector, policy, now);

  const startedAt = now.getTime();
  const run = await database
    .prepare(
      `INSERT INTO ingestion_runs (
         source_id, status, started_at, discovered_count,
         accepted_count, rejected_count
       ) VALUES (?, 'RUNNING', ?, 0, 0, 0)
       RETURNING id`,
    )
    .bind(source.id, startedAt)
    .first<{ id: number }>();
  if (!run?.id) throw new Error("Failed to create ingestion run");

  let batch: CollectedListingBatch;
  let rawSnapshotId: number | null = null;
  try {
    batch = await connector.collect();
    assertCandidateBatch(batch, policy.maxRecordsPerRun ?? 100);
    await database
      .prepare(
        "UPDATE ingestion_runs SET discovered_count = ? WHERE id = ?",
      )
      .bind(batch.candidates.length, run.id)
      .run();
    rawSnapshotId = batch.snapshot
      ? await insertRawSnapshot(database, source.id, run.id, batch.snapshot)
      : null;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown connector error";
    await database
      .prepare(
        `UPDATE ingestion_runs
         SET status = 'FAILED', ended_at = ?, error_summary = ?
         WHERE id = ?`,
      )
      .bind(Date.now(), message.slice(0, 2_000), run.id)
      .run();
    await insertAudit(database, {
      actorUserId,
      action: "INGESTION_RUN_FAILED",
      resourceType: "INGESTION_RUN",
      resourceId: String(run.id),
      after: { sourceSlug: source.slug, status: "FAILED", error: message },
      createdAt: Date.now(),
    });
    throw error;
  }

  const candidates = batch.candidates;
  let acceptedCount = 0;
  const errors: string[] = [];
  const listingPublicIds: string[] = [];

  for (const candidate of candidates) {
    try {
      const normalized = normalizeApprovedFixture(candidate);
      if (normalized.country !== source.country) {
        throw new Error(
          `Source country ${source.country} does not match ${normalized.country}`,
        );
      }
      const listing = await upsertNormalizedListing(
        database,
        source,
        normalized,
        run.id,
        actorUserId,
        startedAt,
        rawSnapshotId,
      );
      if (demoAutoApproval) {
        await autoPublishDemoListing(
          database,
          listing,
          source.slug,
          actorUserId,
          startedAt,
        );
      }
      acceptedCount += 1;
      listingPublicIds.push(listing.publicId);
    } catch (error) {
      errors.push(
        error instanceof Error ? error.message : "Unknown normalization error",
      );
    }
  }

  const rejectedCount = candidates.length - acceptedCount;
  const status = rejectedCount === 0 ? "SUCCEEDED" : "PARTIAL";
  await database
    .prepare(
      `UPDATE ingestion_runs
       SET status = ?, ended_at = ?, accepted_count = ?,
           rejected_count = ?, error_summary = ?
       WHERE id = ?`,
    )
    .bind(
      status,
      Date.now(),
      acceptedCount,
      rejectedCount,
      errors.length ? errors.slice(0, 10).join(" | ") : null,
      run.id,
    )
    .run();

  await insertAudit(database, {
    actorUserId,
    action: "INGESTION_RUN_COMPLETED",
    resourceType: "INGESTION_RUN",
    resourceId: String(run.id),
    after: {
      sourceSlug: source.slug,
      status,
      discoveredCount: candidates.length,
      acceptedCount,
      rejectedCount,
    },
    createdAt: Date.now(),
  });

  return {
    runId: run.id,
    status,
    discoveredCount: candidates.length,
    acceptedCount,
    rejectedCount,
    listingPublicIds,
    errors,
  };
}

async function autoPublishDemoListing(
  database: D1DatabaseLike,
  listing: ListingIdentityRow,
  sourceSlug: string,
  actorUserId: string,
  now: number,
): Promise<void> {
  if (listing.status === "ACTIVE") return;
  await database
    .prepare("UPDATE listings SET status = 'ACTIVE', updated_at = ? WHERE id = ?")
    .bind(now, listing.id)
    .run();
  await insertAudit(database, {
    actorUserId,
    action: "DEMO_LISTING_AUTO_PUBLISHED",
    resourceType: "LISTING",
    resourceId: listing.publicId,
    after: {
      sourceSlug,
      status: "ACTIVE",
      mode: "DEMO_SOURCE_AUTO_APPROVAL",
    },
    createdAt: now,
  });
}

export async function reviewListing(
  database: D1DatabaseLike,
  publicId: string,
  action: ReviewAction,
  actorUserId: string,
  evidence: ListingReviewEvidence,
  now = Date.now(),
): Promise<{ publicId: string; status: string; trustStatus: string }> {
  assertDatabase(database);
  validateListingPublicId(publicId);
  if (action !== "PUBLISH" && action !== "HOLD") {
    throw new RangeError("action must be PUBLISH or HOLD");
  }
  const reviewEvidence = validateListingReviewEvidence(evidence, action);
  await requireAdmin(database, actorUserId);

  const listing = await database
    .prepare(
      `SELECT id, public_id AS publicId, status
       FROM listings
       WHERE public_id = ?`,
    )
    .bind(publicId)
    .first<ListingIdentityRow>();
  if (!listing) throw new Error(`Listing ${publicId} not found`);

  const nextStatus = action === "PUBLISH" ? "ACTIVE" : "HELD";
  if (listing.status === nextStatus) {
    throw new RangeError(`Listing ${publicId} is already ${nextStatus}`);
  }
  const latestTrust = await database
    .prepare(
      `SELECT id, score, status
       FROM trust_score_runs
       WHERE listing_id = ?
       ORDER BY calculated_at DESC, id DESC
       LIMIT 1`,
    )
    .bind(listing.id)
    .first<{ id: number; score: number; status: string }>();
  if (!latestTrust) {
    throw new Error(`Listing ${publicId} has no Trust evaluation`);
  }
  const trustStatus =
    action === "PUBLISH"
      ? latestTrust.score >= 85
        ? "VERIFIED"
        : "REVIEWING"
      : latestTrust.status;

  const statements: D1StatementLike[] = [];
  if (action === "PUBLISH") {
    statements.push(
      database
        .prepare(
          `UPDATE trust_score_runs
           SET status = ?, approved_by_user_id = ?, approved_at = ?
           WHERE id = ?`,
        )
        .bind(trustStatus, actorUserId, now, latestTrust.id),
    );
  }
  statements.push(
    database
      .prepare(
        "UPDATE listings SET status = ?, updated_at = ? WHERE id = ?",
      )
      .bind(nextStatus, now, listing.id),
    database
      .prepare(
        `INSERT INTO listing_review_decisions (
           listing_id, trust_score_run_id, action, reviewer_user_id,
           checklist_json, note, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        listing.id,
        latestTrust.id,
        action,
        actorUserId,
        JSON.stringify(reviewChecklist(reviewEvidence)),
        reviewEvidence.note,
        now,
      ),
  );
  await executeOperationWrites(database, statements);
  await insertAudit(database, {
    actorUserId,
    action: action === "PUBLISH" ? "LISTING_PUBLISHED" : "LISTING_HELD",
    resourceType: "LISTING",
    resourceId: publicId,
    before: { status: listing.status },
    after: {
      status: nextStatus,
      trustStatus,
      reviewChecklist: reviewChecklist(reviewEvidence),
      reviewNoteLength: reviewEvidence.note.length,
    },
    createdAt: now,
  });

  return { publicId, status: nextStatus, trustStatus };
}

async function upsertNormalizedListing(
  database: D1DatabaseLike,
  source: SourceRow,
  listing: NormalizedListing,
  ingestionRunId: number,
  actorUserId: string,
  now: number,
  rawSnapshotId: number | null,
): Promise<ListingIdentityRow> {
  let identity = await database
    .prepare(
      `SELECT l.id, l.public_id AS publicId, l.status
       FROM listing_sources ls
       JOIN listings l ON l.id = ls.listing_id
       WHERE ls.source_id = ? AND ls.external_key = ?`,
    )
    .bind(source.id, listing.source.externalKey)
    .first<ListingIdentityRow>();

  if (!identity) {
    identity = await database
      .prepare(
        `SELECT id, public_id AS publicId, status
         FROM listings
         WHERE country = ? AND fingerprint = ?
         ORDER BY id ASC
         LIMIT 1`,
      )
      .bind(listing.country, listing.fingerprint)
      .first<ListingIdentityRow>();
  }

  if (!identity) {
    const publicId = `${countryPrefix(listing.countryCode)}${listing.fingerprint
      .slice(0, 8)
      .toUpperCase()}`;
    identity = await database
      .prepare(
        `INSERT INTO listings (
           public_id, country, city, district, transaction_type, property_type,
           title, summary, price_minor, currency, area_sqm_x100, bedrooms,
           bathrooms, image_url, fingerprint, status, is_gli_direct,
           first_seen_at, last_seen_at, created_at, updated_at
         ) VALUES (
           ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
           'REVIEW_PENDING', 0, ?, ?, ?, ?
         )
         RETURNING id, public_id AS publicId, status`,
      )
      .bind(
        publicId,
        listing.country,
        listing.city,
        listing.district,
        listing.transaction,
        listing.propertyType,
        listing.title,
        listing.summary,
        listing.priceMinor,
        listing.currency,
        listing.areaSqmX100,
        listing.bedrooms,
        listing.bathrooms,
        listing.imageUrl,
        listing.fingerprint,
        Date.parse(listing.observedAt),
        Date.parse(listing.observedAt),
        now,
        now,
      )
      .first<ListingIdentityRow>();
    if (!identity) throw new Error("Failed to create normalized listing");
  } else {
    await database
      .prepare(
        `UPDATE listings
         SET city = ?, district = ?, transaction_type = ?, property_type = ?,
             title = ?, summary = ?, price_minor = ?, currency = ?,
             area_sqm_x100 = ?, bedrooms = ?, bathrooms = ?, image_url = ?,
             fingerprint = ?, last_seen_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(
        listing.city,
        listing.district,
        listing.transaction,
        listing.propertyType,
        listing.title,
        listing.summary,
        listing.priceMinor,
        listing.currency,
        listing.areaSqmX100,
        listing.bedrooms,
        listing.bathrooms,
        listing.imageUrl,
        listing.fingerprint,
        Date.parse(listing.observedAt),
        now,
        identity.id,
      )
      .run();
  }

  await database
    .prepare(
      `INSERT INTO listing_sources (
         listing_id, source_id, external_key, source_url, first_seen_at, last_seen_at
       ) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(source_id, external_key) DO UPDATE SET
         listing_id = excluded.listing_id,
         source_url = excluded.source_url,
         last_seen_at = excluded.last_seen_at`,
    )
    .bind(
      identity.id,
      source.id,
      listing.source.externalKey,
      listing.source.url,
      Date.parse(listing.observedAt),
      Date.parse(listing.observedAt),
    )
    .run();

  const payload = {
    ...listing,
    strengths: buildStrengths(listing),
    checks: buildChecks(listing),
  };
  await database
    .prepare(
      `INSERT OR IGNORE INTO listing_versions (
         listing_id, raw_snapshot_id, normalized_hash, normalized_payload_json,
         changed_fields_json, observed_at
       ) VALUES (?, ?, ?, ?, '[]', ?)`,
    )
    .bind(
      identity.id,
      rawSnapshotId,
      listing.normalizedHash,
      JSON.stringify(payload),
      Date.parse(listing.observedAt),
    )
    .run();

  const sourceCount = await count(
    database,
    "SELECT COUNT(DISTINCT source_id) AS value FROM listing_sources WHERE listing_id = ?",
    identity.id,
  );
  await insertAutomatedTrustRun(
    database,
    identity.id,
    listing,
    sourceCount,
    now,
  );
  await insertAudit(database, {
    actorUserId,
    action: "LISTING_INGESTED",
    resourceType: "LISTING",
    resourceId: identity.publicId,
    after: {
      ingestionRunId,
      normalizedHash: listing.normalizedHash,
      sourceSlug: source.slug,
      status: identity.status,
    },
    createdAt: now,
  });
  return identity;
}

async function insertAutomatedTrustRun(
  database: D1DatabaseLike,
  listingId: number,
  listing: NormalizedListing,
  sourceCount: number,
  now: number,
): Promise<void> {
  const completenessValues = [
    listing.title,
    listing.summary,
    listing.priceMinor,
    listing.areaSqmX100,
    listing.bedrooms,
    listing.bathrooms,
    listing.district,
    listing.imageUrl,
  ];
  const availableItems = completenessValues.filter(
    (value) => value !== null && value !== "",
  ).length;
  const ageDays = Math.max(
    0,
    Math.floor((now - Date.parse(listing.observedAt)) / 86_400_000),
  );
  const reviewStatus: ReviewStatus = "AUTOMATED_CHECK";
  const input = {
    completeness: {
      availableItems,
      expectedItems: completenessValues.length,
      criticalMissing: listing.imageUrl ? [] : ["imageUrl"],
    },
    freshness: { ageDays, targetFreshnessDays: 7 },
    crossSource: {
      matchingFields: sourceCount >= 2 ? 6 : 0,
      comparedFields: 6,
      independentSources: sourceCount,
    },
    review: { status: reviewStatus },
  };
  const result = calculateTrustScore(input);
  const trustStatus = result.score < 50 ? "NEEDS_ATTENTION" : "PRELIMINARY";
  const manifestHash = `${listing.normalizedHash}:${sourceCount}:${reviewStatus}`;

  await database
    .prepare(
      `INSERT OR IGNORE INTO trust_score_runs (
         listing_id, score, status, rule_version, input_manifest_hash,
         dimensions_json, explanation, calculated_at,
         approved_by_user_id, approved_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)`,
    )
    .bind(
      listingId,
      result.score,
      trustStatus,
      TRUST_RULE_VERSION,
      manifestHash,
      JSON.stringify({ input, reasons: result.reasons, warnings: result.warnings }),
      result.reasons.join(" "),
      now,
    )
    .run();
}

async function loadSourceRow(
  database: D1DatabaseLike,
  sourceSlug: string,
): Promise<SourceRow> {
  if (
    typeof sourceSlug !== "string" ||
    !sourceSlug ||
    sourceSlug.trim() !== sourceSlug
  ) {
    throw new TypeError("sourceSlug must be a non-empty, trimmed string");
  }

  const source = await database
    .prepare(
      `SELECT
         id,
         slug,
         name_internal AS nameInternal,
         country,
         base_url AS baseUrl,
         policy_url AS policyUrl,
         approval_status AS approvalStatus,
         approval_reference AS approvalReference,
         approved_at AS approvedAt,
         approved_by_user_id AS approvedByUserId,
         policy_reviewed_at AS policyReviewedAt,
         permitted_fields_json AS permittedFieldsJson,
         connector_kind AS connectorKind,
         connector_config_json AS connectorConfigJson,
         allowed_hosts_json AS allowedHostsJson,
         max_records_per_run AS maxRecordsPerRun,
         approval_expires_at AS approvalExpiresAt,
         updated_at AS updatedAt
       FROM sources
       WHERE slug = ?`,
    )
    .bind(sourceSlug)
    .first<SourceRow>();
  if (!source) throw new Error(`Source ${sourceSlug} not found`);
  return source;
}

function sourceManagementDetail(source: SourceRow): SourceManagementDetail {
  const connectorConfig = parseObjectJson(
    source.connectorConfigJson,
    `Source ${source.slug} has invalid connector configuration`,
  );
  const feedUrl =
    typeof connectorConfig.feedUrl === "string"
      ? connectorConfig.feedUrl
      : null;
  const authorizationSecretName =
    typeof connectorConfig.authorizationSecretName === "string"
      ? connectorConfig.authorizationSecretName
      : null;
  return {
    id: source.id,
    slug: source.slug,
    nameInternal: source.nameInternal,
    country: source.country,
    baseUrl: source.baseUrl,
    policyUrl: source.policyUrl,
    approvalStatus: source.approvalStatus,
    approvalReference: source.approvalReference,
    approvedAt: source.approvedAt,
    approvalExpiresAt: source.approvalExpiresAt,
    policyReviewedAt: source.policyReviewedAt,
    connectorKind: source.connectorKind,
    feedUrl,
    authorizationSecretName,
    allowedHosts: parseStringArrayJson(
      source.allowedHostsJson,
      `Source ${source.slug} has invalid allowed hosts`,
    ),
    permittedFields: parseStringArrayJson(
      source.permittedFieldsJson,
      `Source ${source.slug} has invalid permitted fields`,
    ),
    maxRecordsPerRun: source.maxRecordsPerRun,
    updatedAt: source.updatedAt,
  };
}

function sourceAuditView(source: SourceManagementDetail) {
  return {
    approvalStatus: source.approvalStatus,
    approvalReference: source.approvalReference,
    approvalExpiresAt: source.approvalExpiresAt,
    connectorKind: source.connectorKind,
    feedUrl: source.feedUrl,
    authorizationSecretName: source.authorizationSecretName,
    allowedHosts: source.allowedHosts,
    permittedFieldCount: source.permittedFields.length,
    maxRecordsPerRun: source.maxRecordsPerRun,
  };
}

function assertCandidateBatch(
  batch: CollectedListingBatch,
  maxRecords: number,
): void {
  if (!batch || typeof batch !== "object" || Array.isArray(batch)) {
    throw new TypeError("connector must return a listing batch");
  }
  if (
    !Array.isArray(batch.candidates) ||
    batch.candidates.length === 0 ||
    batch.candidates.length > maxRecords
  ) {
    throw new RangeError(
      `candidates must contain between 1 and ${maxRecords} listings`,
    );
  }
}

async function insertRawSnapshot(
  database: D1DatabaseLike,
  sourceId: number,
  ingestionRunId: number,
  snapshot: RawSnapshotMetadata,
): Promise<number> {
  if (
    !/^https:\/\/\S+$/i.test(snapshot.sourceUrl) ||
    !/^[a-f0-9]{64}$/.test(snapshot.sourceUrlHash) ||
    !/^[a-f0-9]{64}$/.test(snapshot.contentHash) ||
    !snapshot.objectKey ||
    !Number.isInteger(snapshot.httpStatus) ||
    !Number.isFinite(snapshot.fetchedAt)
  ) {
    throw new TypeError("raw snapshot metadata is invalid");
  }

  const row = await database
    .prepare(
      `INSERT INTO raw_snapshots (
         source_id, ingestion_run_id, source_url, source_url_hash,
         content_hash, object_key, http_status, fetched_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id`,
    )
    .bind(
      sourceId,
      ingestionRunId,
      snapshot.sourceUrl,
      snapshot.sourceUrlHash,
      snapshot.contentHash,
      snapshot.objectKey,
      snapshot.httpStatus,
      snapshot.fetchedAt,
    )
    .first<{ id: number }>();
  if (!row?.id) throw new Error("Failed to record raw snapshot");
  return row.id;
}

function sourcePolicy(source: SourceRow): SourcePolicy {
  const permittedFields = parseStringArrayJson(
    source.permittedFieldsJson,
    `Source ${source.slug} has invalid permitted fields`,
  );
  const allowedHosts = parseStringArrayJson(
    source.allowedHostsJson,
    `Source ${source.slug} has invalid allowed hosts`,
  );
  if (
    !Number.isInteger(source.maxRecordsPerRun) ||
    source.maxRecordsPerRun < 1 ||
    source.maxRecordsPerRun > 1_000
  ) {
    throw new Error(`Source ${source.slug} has invalid record limit`);
  }

  return {
    sourceSlug: source.slug,
    approvalStatus: source.approvalStatus as SourcePolicy["approvalStatus"],
    permittedFields,
    approvalExpiresAt:
      source.approvalExpiresAt === null
        ? null
        : new Date(source.approvalExpiresAt).toISOString(),
    connectorKind: source.connectorKind,
    allowedHosts,
    maxRecordsPerRun: source.maxRecordsPerRun,
  };
}

function parseStringArrayJson(value: string, message: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(message);
  }
  if (
    !Array.isArray(parsed) ||
    parsed.some((entry) => typeof entry !== "string")
  ) {
    throw new Error(message);
  }
  return parsed;
}

function parseObjectJson(
  value: string,
  message: string,
): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(message);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(message);
  }
  return parsed as Record<string, unknown>;
}

function connectorStatus(
  source: SourceDashboardRow,
): OperationsSource["connectorStatus"] {
  if (source.approvalStatus !== "APPROVED") return "APPROVAL_REQUIRED";
  if (source.connectorKind === "DISABLED") return "CONFIGURATION_REQUIRED";
  return "READY";
}

function countryPrefix(countryCode: string): string {
  return `GLI-${countryCode}-`;
}

function buildStrengths(listing: NormalizedListing): string[] {
  const strengths = [
    `${listing.district} 생활권`,
    `${listing.bedrooms}베드룸 · ${listing.areaSqmX100 / 100}㎡`,
  ];
  if (/river|mekong|강/i.test(`${listing.title} ${listing.summary}`)) {
    strengths.push("강 전망 후보");
  }
  return strengths;
}

function buildChecks(listing: NormalizedListing): string[] {
  const checks = ["소유·임대 권한 자료", "관리비와 계약 조건"];
  if (listing.transaction === "rent") checks.push("단기 임대 허용 여부");
  return checks;
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

function validateListingPublicId(value: unknown): asserts value is string {
  if (
    typeof value !== "string" ||
    !/^GLI-[A-Z]{2}-[A-Z0-9-]{3,32}$/.test(value)
  ) {
    throw new TypeError("publicId is invalid");
  }
}

function validateListingReviewEvidence(
  value: unknown,
  action: ReviewAction,
): ListingReviewEvidence {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("reviewEvidence must be an object");
  }
  const input = value as Record<string, unknown>;
  const checklist = {
    sourceRightsConfirmed: input.sourceRightsConfirmed === true,
    factsCrossChecked: input.factsCrossChecked === true,
    publicCopyReviewed: input.publicCopyReviewed === true,
    limitationsRecorded: input.limitationsRecorded === true,
  };
  if (
    action === "PUBLISH" &&
    Object.values(checklist).some((checked) => !checked)
  ) {
    throw new RangeError(
      "Every review checklist item must be confirmed before publication",
    );
  }
  if (typeof input.note !== "string") {
    throw new TypeError("review note must be a string");
  }
  const note = input.note.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (note.length < 20 || note.length > 1_000) {
    throw new RangeError(
      "review note must be between 20 and 1000 characters",
    );
  }
  return { ...checklist, note };
}

function reviewChecklist(
  evidence: ListingReviewEvidence,
): ListingReviewChecklist {
  return {
    sourceRightsConfirmed: evidence.sourceRightsConfirmed,
    factsCrossChecked: evidence.factsCrossChecked,
    publicCopyReviewed: evidence.publicCopyReviewed,
    limitationsRecorded: evidence.limitationsRecorded,
  };
}

function parseReviewChecklist(value: string): ListingReviewChecklist {
  const record = parseJsonRecord(value);
  return {
    sourceRightsConfirmed: record.sourceRightsConfirmed === true,
    factsCrossChecked: record.factsCrossChecked === true,
    publicCopyReviewed: record.publicCopyReviewed === true,
    limitationsRecorded: record.limitationsRecorded === true,
  };
}

function parseJsonRecord(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function parseJsonArray(value: string): unknown[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function executeOperationWrites(
  database: D1DatabaseLike,
  statements: D1StatementLike[],
): Promise<void> {
  if (typeof database.batch === "function") {
    const results = await database.batch(statements);
    if (results.some((result) => result.success === false)) {
      throw new Error("D1 review batch write failed");
    }
    return;
  }
  for (const statement of statements) {
    const result = await statement.run();
    if (result.success === false) {
      throw new Error("D1 review write failed");
    }
  }
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

function validateSourceSlug(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[a-z0-9][a-z0-9-]{2,63}$/.test(value)
  ) {
    throw new TypeError("sourceSlug is invalid");
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

function validateText(
  value: unknown,
  field: string,
  minimumLength: number,
  maximumLength: number,
): string {
  if (typeof value !== "string") {
    throw new TypeError(`${field} must be a string`);
  }
  const normalized = value.trim().replace(/\s+/g, " ");
  if (
    normalized.length < minimumLength ||
    normalized.length > maximumLength ||
    /[\u0000-\u001f\u007f]/.test(normalized)
  ) {
    throw new TypeError(`${field} is invalid`);
  }
  return normalized;
}

function validateApprovalExpiry(value: unknown, now: number): number | null {
  if (value === null) return null;
  const timestamp = validateTimestamp(value, "approvalExpiresAt");
  const maximum = now + 2 * 365 * 24 * 60 * 60 * 1000;
  if (timestamp <= now || timestamp > maximum) {
    throw new RangeError(
      "approvalExpiresAt must be in the future and within two years",
    );
  }
  return timestamp;
}

function validateFeedUrl(value: unknown): URL {
  if (typeof value !== "string" || !value || value.trim() !== value) {
    throw new TypeError("feedUrl must be a non-empty, trimmed string");
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError("feedUrl must be an absolute URL");
  }
  const hostname = url.hostname.toLocaleLowerCase("en-US");
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.hash ||
    url.port ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    isPrivateIpv4(hostname)
  ) {
    throw new TypeError(
      "feedUrl must use a public HTTPS host without credentials, a port, or a fragment",
    );
  }
  return url;
}

function isPrivateIpv4(hostname: string): boolean {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) return false;
  const octets = hostname.split(".").map(Number);
  if (octets.some((octet) => octet < 0 || octet > 255)) return true;
  return (
    octets[0] === 10 ||
    octets[0] === 127 ||
    (octets[0] === 169 && octets[1] === 254) ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  );
}

function validateSourceSecretName(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (
    typeof value !== "string" ||
    !/^SOURCE_SECRET_[A-Z0-9_]{3,96}$/.test(value)
  ) {
    throw new TypeError(
      "authorizationSecretName must use the SOURCE_SECRET_ prefix",
    );
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
