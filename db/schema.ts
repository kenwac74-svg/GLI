import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const sources = sqliteTable(
  "sources",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    nameInternal: text("name_internal").notNull(),
    country: text("country").notNull(),
    baseUrl: text("base_url").notNull(),
    policyUrl: text("policy_url"),
    approvalStatus: text("approval_status").notNull().default("PENDING"),
    permittedFieldsJson: text("permitted_fields_json").notNull().default("[]"),
    connectorKind: text("connector_kind").notNull().default("DISABLED"),
    connectorConfigJson: text("connector_config_json").notNull().default("{}"),
    allowedHostsJson: text("allowed_hosts_json").notNull().default("[]"),
    maxRecordsPerRun: integer("max_records_per_run").notNull().default(100),
    approvalReference: text("approval_reference"),
    approvedByUserId: text("approved_by_user_id"),
    policyReviewedAt: integer("policy_reviewed_at"),
    approvedAt: integer("approved_at"),
    approvalExpiresAt: integer("approval_expires_at"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [uniqueIndex("sources_slug_uidx").on(table.slug)],
);

export const ingestionRuns = sqliteTable(
  "ingestion_runs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sourceId: integer("source_id")
      .notNull()
      .references(() => sources.id),
    status: text("status").notNull(),
    startedAt: integer("started_at").notNull(),
    endedAt: integer("ended_at"),
    discoveredCount: integer("discovered_count").notNull().default(0),
    acceptedCount: integer("accepted_count").notNull().default(0),
    rejectedCount: integer("rejected_count").notNull().default(0),
    errorSummary: text("error_summary"),
  },
  (table) => [index("ingestion_runs_source_started_idx").on(table.sourceId, table.startedAt)],
);

export const rawSnapshots = sqliteTable(
  "raw_snapshots",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sourceId: integer("source_id")
      .notNull()
      .references(() => sources.id),
    ingestionRunId: integer("ingestion_run_id").references(() => ingestionRuns.id),
    sourceUrl: text("source_url").notNull(),
    sourceUrlHash: text("source_url_hash").notNull(),
    contentHash: text("content_hash").notNull(),
    objectKey: text("object_key").notNull(),
    httpStatus: integer("http_status").notNull(),
    fetchedAt: integer("fetched_at").notNull(),
  },
  (table) => [
    index("raw_snapshots_lookup_idx").on(
      table.sourceId,
      table.sourceUrlHash,
      table.fetchedAt,
    ),
    uniqueIndex("raw_snapshots_object_key_uidx").on(table.objectKey),
  ],
);

export const listings = sqliteTable(
  "listings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    publicId: text("public_id").notNull(),
    country: text("country").notNull(),
    city: text("city").notNull(),
    district: text("district"),
    transactionType: text("transaction_type").notNull(),
    propertyType: text("property_type").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    priceMinor: integer("price_minor").notNull(),
    currency: text("currency").notNull(),
    areaSqmX100: integer("area_sqm_x100"),
    bedrooms: integer("bedrooms"),
    bathrooms: integer("bathrooms"),
    imageUrl: text("image_url"),
    fingerprint: text("fingerprint"),
    status: text("status").notNull().default("ACTIVE"),
    isGliDirect: integer("is_gli_direct", { mode: "boolean" }).notNull().default(false),
    firstSeenAt: integer("first_seen_at").notNull(),
    lastSeenAt: integer("last_seen_at").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("listings_public_id_uidx").on(table.publicId),
    index("listings_search_idx").on(
      table.country,
      table.city,
      table.transactionType,
      table.status,
      table.priceMinor,
    ),
    index("listings_fingerprint_idx").on(table.country, table.fingerprint),
  ],
);

export const listingSources = sqliteTable(
  "listing_sources",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    listingId: integer("listing_id")
      .notNull()
      .references(() => listings.id),
    sourceId: integer("source_id")
      .notNull()
      .references(() => sources.id),
    externalKey: text("external_key").notNull(),
    sourceUrl: text("source_url").notNull(),
    firstSeenAt: integer("first_seen_at").notNull(),
    lastSeenAt: integer("last_seen_at").notNull(),
  },
  (table) => [
    uniqueIndex("listing_sources_external_uidx").on(table.sourceId, table.externalKey),
    index("listing_sources_listing_idx").on(table.listingId),
  ],
);

export const listingVersions = sqliteTable(
  "listing_versions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    listingId: integer("listing_id")
      .notNull()
      .references(() => listings.id),
    rawSnapshotId: integer("raw_snapshot_id").references(() => rawSnapshots.id),
    normalizedHash: text("normalized_hash").notNull(),
    normalizedPayloadJson: text("normalized_payload_json").notNull(),
    changedFieldsJson: text("changed_fields_json").notNull().default("[]"),
    observedAt: integer("observed_at").notNull(),
  },
  (table) => [
    uniqueIndex("listing_versions_hash_uidx").on(table.listingId, table.normalizedHash),
    index("listing_versions_observed_idx").on(table.listingId, table.observedAt),
  ],
);

export const trustScoreRuns = sqliteTable(
  "trust_score_runs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    listingId: integer("listing_id")
      .notNull()
      .references(() => listings.id),
    score: integer("score").notNull(),
    status: text("status").notNull(),
    ruleVersion: text("rule_version").notNull(),
    inputManifestHash: text("input_manifest_hash").notNull(),
    dimensionsJson: text("dimensions_json").notNull(),
    explanation: text("explanation").notNull(),
    calculatedAt: integer("calculated_at").notNull(),
    approvedByUserId: text("approved_by_user_id"),
    approvedAt: integer("approved_at"),
  },
  (table) => [
    uniqueIndex("trust_score_runs_manifest_uidx").on(
      table.listingId,
      table.ruleVersion,
      table.inputManifestHash,
    ),
    index("trust_score_runs_latest_idx").on(table.listingId, table.calculatedAt),
  ],
);

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name"),
    role: text("role").notNull().default("MEMBER"),
    status: text("status").notNull().default("ACTIVE"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [uniqueIndex("users_email_uidx").on(table.email)],
);

export const favorites = sqliteTable(
  "favorites",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    listingId: integer("listing_id")
      .notNull()
      .references(() => listings.id),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [uniqueIndex("favorites_user_listing_uidx").on(table.userId, table.listingId)],
);

export const consultations = sqliteTable(
  "consultations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    listingId: integer("listing_id").references(() => listings.id),
    requestText: text("request_text").notNull(),
    preferredAt: integer("preferred_at"),
    assigneeUserId: text("assignee_user_id"),
    status: text("status").notNull().default("RECEIVED"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [index("consultations_user_status_idx").on(table.userId, table.status)],
);

export const consultationEvents = sqliteTable(
  "consultation_events",
  {
    id: text("id").primaryKey(),
    consultationId: text("consultation_id")
      .notNull()
      .references(() => consultations.id),
    actorUserId: text("actor_user_id").references(() => users.id),
    eventType: text("event_type").notNull(),
    body: text("body"),
    status: text("status"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("consultation_events_thread_idx").on(
      table.consultationId,
      table.createdAt,
      table.id,
    ),
  ],
);

export const memberNotifications = sqliteTable(
  "member_notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    eventKey: text("event_key").notNull(),
    readAt: integer("read_at"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("member_notifications_event_uidx").on(table.eventKey),
    index("member_notifications_user_unread_idx").on(
      table.userId,
      table.readAt,
      table.createdAt,
      table.id,
    ),
  ],
);

export const memberships = sqliteTable(
  "memberships",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    planId: text("plan_id").notNull(),
    provider: text("provider").notNull(),
    providerCustomerId: text("provider_customer_id"),
    providerSubscriptionId: text("provider_subscription_id"),
    status: text("status").notNull(),
    periodStart: integer("period_start").notNull(),
    periodEnd: integer("period_end").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [index("memberships_user_status_idx").on(table.userId, table.status)],
);

export const cashCheckoutSessions = sqliteTable(
  "cash_checkout_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    planId: text("plan_id").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull(),
    provider: text("provider").notNull(),
    providerSessionId: text("provider_session_id"),
    status: text("status").notNull(),
    membershipId: text("membership_id").references(() => memberships.id),
    expiresAt: integer("expires_at").notNull(),
    completedAt: integer("completed_at"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("cash_checkout_user_status_idx").on(
      table.userId,
      table.status,
      table.createdAt,
    ),
    uniqueIndex("cash_checkout_provider_session_uidx").on(
      table.provider,
      table.providerSessionId,
    ),
  ],
);

export const paymentWebhookEvents = sqliteTable(
  "payment_webhook_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    provider: text("provider").notNull(),
    providerEventId: text("provider_event_id").notNull(),
    eventType: text("event_type").notNull(),
    payloadHash: text("payload_hash").notNull(),
    status: text("status").notNull(),
    checkoutId: text("checkout_id").references(() => cashCheckoutSessions.id),
    errorSummary: text("error_summary"),
    receivedAt: integer("received_at").notNull(),
    processedAt: integer("processed_at"),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("payment_webhook_provider_event_uidx").on(
      table.provider,
      table.providerEventId,
    ),
    index("payment_webhook_status_received_idx").on(
      table.status,
      table.receivedAt,
    ),
  ],
);

export const operationalAlerts = sqliteTable(
  "operational_alerts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    dedupeKey: text("dedupe_key").notNull(),
    origin: text("origin").notNull(),
    category: text("category").notNull(),
    severity: text("severity").notNull(),
    status: text("status").notNull(),
    title: text("title").notNull(),
    detail: text("detail").notNull(),
    resourceType: text("resource_type"),
    resourceId: text("resource_id"),
    occurrenceCount: integer("occurrence_count").notNull().default(1),
    notifiedOccurrenceCount: integer("notified_occurrence_count")
      .notNull()
      .default(0),
    lastNotifiedAt: integer("last_notified_at"),
    firstSeenAt: integer("first_seen_at").notNull(),
    lastSeenAt: integer("last_seen_at").notNull(),
    acknowledgedByUserId: text("acknowledged_by_user_id"),
    acknowledgedAt: integer("acknowledged_at"),
    resolvedAt: integer("resolved_at"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("operational_alerts_dedupe_uidx").on(table.dedupeKey),
    index("operational_alerts_status_severity_idx").on(
      table.status,
      table.severity,
      table.lastSeenAt,
    ),
  ],
);

export const retryJobs = sqliteTable(
  "retry_jobs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    dedupeKey: text("dedupe_key").notNull(),
    jobType: text("job_type").notNull(),
    payloadJson: text("payload_json").notNull(),
    status: text("status").notNull(),
    attemptCount: integer("attempt_count").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    availableAt: integer("available_at").notNull(),
    claimedAt: integer("claimed_at"),
    completedAt: integer("completed_at"),
    lastError: text("last_error"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("retry_jobs_dedupe_uidx").on(table.dedupeKey),
    index("retry_jobs_status_available_idx").on(
      table.status,
      table.availableAt,
    ),
  ],
);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    actorUserId: text("actor_user_id"),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    beforeJson: text("before_json"),
    afterJson: text("after_json"),
    requestId: text("request_id"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("audit_logs_resource_idx").on(
      table.resourceType,
      table.resourceId,
      table.createdAt,
    ),
    index("audit_logs_created_idx").on(table.createdAt, table.id),
    index("audit_logs_action_created_idx").on(
      table.action,
      table.createdAt,
      table.id,
    ),
  ],
);

export const backupVerifications = sqliteTable(
  "backup_verifications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    environment: text("environment").notNull(),
    storageProvider: text("storage_provider").notNull(),
    objectKey: text("object_key").notNull(),
    manifestSha256: text("manifest_sha256").notNull(),
    capturedAt: integer("captured_at").notNull(),
    restoreTestedAt: integer("restore_tested_at"),
    restoreResult: text("restore_result").notNull(),
    recordCountsJson: text("record_counts_json").notNull(),
    verifiedByUserId: text("verified_by_user_id")
      .notNull()
      .references(() => users.id),
    notes: text("notes"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("backup_verifications_object_manifest_uidx").on(
      table.objectKey,
      table.manifestSha256,
    ),
    index("backup_verifications_environment_created_idx").on(
      table.environment,
      table.createdAt,
    ),
  ],
);
