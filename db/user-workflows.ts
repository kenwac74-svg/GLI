const USER_ID_PREFIX = "usr_";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const DEMO_CASH_PLAN_IDS = new Set(["explore", "investor", "private"]);

type D1Result<T = Record<string, unknown>> = {
  results?: T[];
  success?: boolean;
  meta?: {
    changes?: number;
  };
};

export type D1StatementLike = {
  bind(...values: unknown[]): D1StatementLike;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<D1Result<T>>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
};

export type D1DatabaseLike = {
  prepare(sql: string): D1StatementLike;
  batch?<T = Record<string, unknown>>(
    statements: D1StatementLike[],
  ): Promise<D1Result<T>[]>;
};

export type WorkflowOptions = {
  now?: () => number;
  randomUUID?: () => string;
  requestId?: string | null;
};

export type WorkflowUser = {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  status: string;
  createdAt: number;
  updatedAt: number;
};

export type DashboardFavorite = {
  publicId: string;
  country: string;
  city: string;
  district: string | null;
  transactionType: string;
  propertyType: string;
  title: string;
  summary: string;
  priceMinor: number;
  currency: string;
  imageUrl: string | null;
  trustScore: number;
  trustStatus: string;
  favoritedAt: number;
};

export type DashboardConsultation = {
  id: string;
  listingPublicId: string | null;
  listingTitle: string | null;
  requestText: string;
  preferredAt: number | null;
  status: string;
  createdAt: number;
  updatedAt: number;
};

export type DashboardMembership = {
  id: string;
  planId: string;
  provider: string;
  status: string;
  periodStart: number;
  periodEnd: number;
  createdAt: number;
  updatedAt: number;
};

export type UserDashboard = {
  user: WorkflowUser;
  favorites: DashboardFavorite[];
  consultations: DashboardConsultation[];
  activeMembership: DashboardMembership | null;
};

type UserRow = {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  status: string;
  createdAt: number;
  updatedAt: number;
};

type ListingRow = {
  id: number;
  publicId: string;
  title: string;
  status: string;
};

export function normalizeEmail(value: string): string {
  if (typeof value !== "string") {
    throw new TypeError("email must be a string");
  }

  const email = value.trim().toLowerCase();
  if (
    email.length < 3 ||
    email.length > 320 ||
    /\s/.test(email) ||
    !/^[^@]+@[^@]+\.[^@]+$/.test(email)
  ) {
    throw new TypeError("email must be a valid email address");
  }
  return email;
}

export async function createStableUserId(email: string): Promise<string> {
  const normalizedEmail = normalizeEmail(email);
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto SHA-256 is unavailable");
  }

  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(normalizedEmail),
  );
  const hex = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `${USER_ID_PREFIX}${hex}`;
}

export async function ensureUser(
  database: D1DatabaseLike,
  input: { email: string; displayName?: string | null },
  options: WorkflowOptions = {},
): Promise<WorkflowUser> {
  assertDatabase(database);
  const email = normalizeEmail(input.email);
  const id = await createStableUserId(email);
  const displayName = normalizeDisplayName(input.displayName);
  const now = getNow(options);
  const existing = await getUser(database, id);

  if (!existing) {
    await executeWrites(database, [
      database
        .prepare(`
          INSERT INTO users (
            id, email, display_name, role, status, created_at, updated_at
          ) VALUES (?, ?, ?, 'MEMBER', 'ACTIVE', ?, ?)
        `)
        .bind(id, email, displayName, now, now),
      auditStatement(database, {
        actorUserId: id,
        action: "USER_CREATED",
        resourceType: "USER",
        resourceId: id,
        before: null,
        after: { email, displayName, role: "MEMBER", status: "ACTIVE" },
        requestId: options.requestId,
        createdAt: now,
      }),
    ]);

    return {
      id,
      email,
      displayName,
      role: "MEMBER",
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    };
  }

  const nextDisplayName =
    displayName === undefined ? existing.displayName : displayName;
  if (existing.email !== email || existing.displayName !== nextDisplayName) {
    await executeWrites(database, [
      database
        .prepare(`
          UPDATE users
          SET email = ?, display_name = ?, updated_at = ?
          WHERE id = ?
        `)
        .bind(email, nextDisplayName, now, id),
      auditStatement(database, {
        actorUserId: id,
        action: "USER_UPDATED",
        resourceType: "USER",
        resourceId: id,
        before: {
          email: existing.email,
          displayName: existing.displayName,
        },
        after: { email, displayName: nextDisplayName },
        requestId: options.requestId,
        createdAt: now,
      }),
    ]);
  }

  return {
    ...existing,
    email,
    displayName: nextDisplayName,
    updatedAt:
      existing.email !== email || existing.displayName !== nextDisplayName
        ? now
        : existing.updatedAt,
  };
}

export async function getUserDashboard(
  database: D1DatabaseLike,
  userId: string,
  options: Pick<WorkflowOptions, "now"> = {},
): Promise<UserDashboard> {
  assertDatabase(database);
  const id = validateOpaqueId(userId, "userId");
  const user = await requireActiveUser(database, id);
  const now = getNow(options);

  const [favoriteResult, consultationResult, activeMembership] =
    await Promise.all([
      database
        .prepare(`
          SELECT
            l.public_id AS publicId,
            l.country,
            l.city,
            l.district,
            l.transaction_type AS transactionType,
            l.property_type AS propertyType,
            l.title,
            l.summary,
            l.price_minor AS priceMinor,
            l.currency,
            l.image_url AS imageUrl,
            COALESCE(ts.score, 0) AS trustScore,
            COALESCE(ts.status, 'PRELIMINARY') AS trustStatus,
            f.created_at AS favoritedAt
          FROM favorites f
          INNER JOIN listings l ON l.id = f.listing_id
          LEFT JOIN trust_score_runs ts
            ON ts.id = (
              SELECT inner_ts.id
              FROM trust_score_runs inner_ts
              WHERE inner_ts.listing_id = l.id
              ORDER BY inner_ts.calculated_at DESC, inner_ts.id DESC
              LIMIT 1
            )
          WHERE f.user_id = ? AND l.status = 'ACTIVE'
          ORDER BY f.created_at DESC, l.public_id ASC
        `)
        .bind(id)
        .all<DashboardFavorite>(),
      database
        .prepare(`
          SELECT
            c.id,
            l.public_id AS listingPublicId,
            l.title AS listingTitle,
            c.request_text AS requestText,
            c.preferred_at AS preferredAt,
            c.status,
            c.created_at AS createdAt,
            c.updated_at AS updatedAt
          FROM consultations c
          LEFT JOIN listings l ON l.id = c.listing_id
          WHERE c.user_id = ?
          ORDER BY c.created_at DESC, c.id DESC
        `)
        .bind(id)
        .all<DashboardConsultation>(),
      database
        .prepare(`
          SELECT
            id,
            plan_id AS planId,
            provider,
            status,
            period_start AS periodStart,
            period_end AS periodEnd,
            created_at AS createdAt,
            updated_at AS updatedAt
          FROM memberships
          WHERE user_id = ? AND status = 'ACTIVE' AND period_end > ?
          ORDER BY period_end DESC, created_at DESC
          LIMIT 1
        `)
        .bind(id, now)
        .first<DashboardMembership>(),
    ]);

  return {
    user,
    favorites: favoriteResult.results ?? [],
    consultations: consultationResult.results ?? [],
    activeMembership,
  };
}

export async function addFavorite(
  database: D1DatabaseLike,
  input: {
    userId: string;
    listingPublicId: string;
    requestId?: string | null;
  },
  options: WorkflowOptions = {},
): Promise<{ created: boolean; listingPublicId: string }> {
  assertDatabase(database);
  const userId = validateOpaqueId(input.userId, "userId");
  const listingPublicId = validateOpaqueId(
    input.listingPublicId,
    "listingPublicId",
  );
  await requireActiveUser(database, userId);
  const listing = await requireActiveListing(database, listingPublicId);
  const existing = await database
    .prepare(`
      SELECT user_id AS userId
      FROM favorites
      WHERE user_id = ? AND listing_id = ?
      LIMIT 1
    `)
    .bind(userId, listing.id)
    .first<{ userId: string }>();

  if (existing) {
    return { created: false, listingPublicId };
  }

  const now = getNow(options);
  await executeWrites(database, [
    database
      .prepare(`
        INSERT OR IGNORE INTO favorites (user_id, listing_id, created_at)
        VALUES (?, ?, ?)
      `)
      .bind(userId, listing.id, now),
    auditStatement(database, {
      actorUserId: userId,
      action: "FAVORITE_ADDED",
      resourceType: "LISTING",
      resourceId: listingPublicId,
      before: null,
      after: { userId, listingPublicId },
      requestId: input.requestId ?? options.requestId,
      createdAt: now,
    }),
  ]);

  return { created: true, listingPublicId };
}

export async function removeFavorite(
  database: D1DatabaseLike,
  input: {
    userId: string;
    listingPublicId: string;
    requestId?: string | null;
  },
  options: WorkflowOptions = {},
): Promise<{ removed: boolean; listingPublicId: string }> {
  assertDatabase(database);
  const userId = validateOpaqueId(input.userId, "userId");
  const listingPublicId = validateOpaqueId(
    input.listingPublicId,
    "listingPublicId",
  );
  await requireActiveUser(database, userId);
  const listing = await requireListing(database, listingPublicId);
  const existing = await database
    .prepare(`
      SELECT user_id AS userId
      FROM favorites
      WHERE user_id = ? AND listing_id = ?
      LIMIT 1
    `)
    .bind(userId, listing.id)
    .first<{ userId: string }>();

  if (!existing) {
    return { removed: false, listingPublicId };
  }

  const now = getNow(options);
  await executeWrites(database, [
    database
      .prepare(`
        DELETE FROM favorites
        WHERE user_id = ? AND listing_id = ?
      `)
      .bind(userId, listing.id),
    auditStatement(database, {
      actorUserId: userId,
      action: "FAVORITE_REMOVED",
      resourceType: "LISTING",
      resourceId: listingPublicId,
      before: { userId, listingPublicId },
      after: null,
      requestId: input.requestId ?? options.requestId,
      createdAt: now,
    }),
  ]);

  return { removed: true, listingPublicId };
}

export async function createConsultation(
  database: D1DatabaseLike,
  input: {
    userId: string;
    requestText: string;
    listingPublicId?: string | null;
    preferredAt?: number | null;
    requestId?: string | null;
  },
  options: WorkflowOptions = {},
): Promise<DashboardConsultation> {
  assertDatabase(database);
  const userId = validateOpaqueId(input.userId, "userId");
  const requestText = normalizeRequestText(input.requestText);
  const preferredAt = normalizeOptionalTimestamp(
    input.preferredAt,
    "preferredAt",
  );
  await requireActiveUser(database, userId);

  let listing: ListingRow | null = null;
  if (input.listingPublicId != null) {
    const listingPublicId = validateOpaqueId(
      input.listingPublicId,
      "listingPublicId",
    );
    listing = await requireActiveListing(database, listingPublicId);
  }

  const now = getNow(options);
  const id = `con_${getRandomUUID(options)}`;
  const consultation: DashboardConsultation = {
    id,
    listingPublicId: listing?.publicId ?? null,
    listingTitle: listing?.title ?? null,
    requestText,
    preferredAt,
    status: "RECEIVED",
    createdAt: now,
    updatedAt: now,
  };

  await executeWrites(database, [
    database
      .prepare(`
        INSERT INTO consultations (
          id, user_id, listing_id, request_text, preferred_at,
          assignee_user_id, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, NULL, 'RECEIVED', ?, ?)
      `)
      .bind(
        id,
        userId,
        listing?.id ?? null,
        requestText,
        preferredAt,
        now,
        now,
      ),
    auditStatement(database, {
      actorUserId: userId,
      action: "CONSULTATION_CREATED",
      resourceType: "CONSULTATION",
      resourceId: id,
      before: null,
      after: {
        listingPublicId: consultation.listingPublicId,
        requestText,
        preferredAt,
        status: "RECEIVED",
      },
      requestId: input.requestId ?? options.requestId,
      createdAt: now,
    }),
  ]);

  return consultation;
}

export async function activateDemoCashMembership(
  database: D1DatabaseLike,
  input: {
    userId: string;
    planId: string;
    requestId?: string | null;
  },
  options: WorkflowOptions = {},
): Promise<
  DashboardMembership & {
    demo: true;
    charged: false;
  }
> {
  assertDatabase(database);
  const userId = validateOpaqueId(input.userId, "userId");
  const planId = normalizePlanId(input.planId);
  await requireActiveUser(database, userId);

  const now = getNow(options);
  const id = `mem_${getRandomUUID(options)}`;
  const membership = {
    id,
    planId,
    provider: "DEMO_CASH",
    status: "ACTIVE",
    periodStart: now,
    periodEnd: now + THIRTY_DAYS_MS,
    createdAt: now,
    updatedAt: now,
    demo: true as const,
    charged: false as const,
  };

  await executeWrites(database, [
    database
      .prepare(`
        UPDATE memberships
        SET status = 'REPLACED', updated_at = ?
        WHERE user_id = ? AND provider = 'DEMO_CASH' AND status = 'ACTIVE'
      `)
      .bind(now, userId),
    database
      .prepare(`
        INSERT INTO memberships (
          id, user_id, plan_id, provider,
          provider_customer_id, provider_subscription_id,
          status, period_start, period_end, created_at, updated_at
        ) VALUES (?, ?, ?, 'DEMO_CASH', NULL, NULL, 'ACTIVE', ?, ?, ?, ?)
      `)
      .bind(id, userId, planId, now, membership.periodEnd, now, now),
    auditStatement(database, {
      actorUserId: userId,
      action: "DEMO_CASH_MEMBERSHIP_ACTIVATED",
      resourceType: "MEMBERSHIP",
      resourceId: id,
      before: null,
      after: {
        planId,
        provider: "DEMO_CASH",
        status: "ACTIVE",
        periodStart: now,
        periodEnd: membership.periodEnd,
        charged: false,
      },
      requestId: input.requestId ?? options.requestId,
      createdAt: now,
    }),
  ]);

  return membership;
}

async function getUser(
  database: D1DatabaseLike,
  userId: string,
): Promise<WorkflowUser | null> {
  return database
    .prepare(`
      SELECT
        id,
        email,
        display_name AS displayName,
        role,
        status,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM users
      WHERE id = ?
      LIMIT 1
    `)
    .bind(userId)
    .first<UserRow>();
}

async function requireActiveUser(
  database: D1DatabaseLike,
  userId: string,
): Promise<WorkflowUser> {
  const user = await getUser(database, userId);
  if (!user) {
    throw new Error("User was not found");
  }
  if (user.status !== "ACTIVE") {
    throw new Error("User is not active");
  }
  return user;
}

async function requireListing(
  database: D1DatabaseLike,
  publicId: string,
): Promise<ListingRow> {
  const listing = await database
    .prepare(`
      SELECT id, public_id AS publicId, title, status
      FROM listings
      WHERE public_id = ?
      LIMIT 1
    `)
    .bind(publicId)
    .first<ListingRow>();

  if (!listing) {
    throw new Error(`Listing ${publicId} was not found`);
  }
  return listing;
}

async function requireActiveListing(
  database: D1DatabaseLike,
  publicId: string,
): Promise<ListingRow> {
  const listing = await requireListing(database, publicId);
  if (listing.status !== "ACTIVE") {
    throw new Error(`Listing ${publicId} is not active`);
  }
  return listing;
}

function auditStatement(
  database: D1DatabaseLike,
  input: {
    actorUserId: string | null;
    action: string;
    resourceType: string;
    resourceId: string;
    before: unknown;
    after: unknown;
    requestId?: string | null;
    createdAt: number;
  },
): D1StatementLike {
  return database
    .prepare(`
      INSERT INTO audit_logs (
        actor_user_id, action, resource_type, resource_id,
        before_json, after_json, request_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      input.actorUserId,
      input.action,
      input.resourceType,
      input.resourceId,
      input.before == null ? null : JSON.stringify(input.before),
      input.after == null ? null : JSON.stringify(input.after),
      normalizeRequestId(input.requestId),
      input.createdAt,
    );
}

async function executeWrites(
  database: D1DatabaseLike,
  statements: D1StatementLike[],
): Promise<void> {
  if (typeof database.batch === "function") {
    const results = await database.batch(statements);
    if (results.some((result) => result.success === false)) {
      throw new Error("D1 batch write failed");
    }
    return;
  }

  for (const statement of statements) {
    const result = await statement.run();
    if (result.success === false) {
      throw new Error("D1 write failed");
    }
  }
}

function assertDatabase(
  database: D1DatabaseLike,
): asserts database is D1DatabaseLike {
  if (!database || typeof database.prepare !== "function") {
    throw new TypeError("A D1 database binding is required");
  }
}

function validateOpaqueId(value: string, fieldName: string): string {
  if (typeof value !== "string") {
    throw new TypeError(`${fieldName} must be a string`);
  }
  const normalized = value.trim();
  if (
    normalized.length < 1 ||
    normalized.length > 128 ||
    !/^[A-Za-z0-9._:-]+$/.test(normalized)
  ) {
    throw new TypeError(`${fieldName} is invalid`);
  }
  return normalized;
}

function normalizeDisplayName(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new TypeError("displayName must be a string or null");
  }
  const normalized = value.trim();
  if (normalized.length === 0) return null;
  if (normalized.length > 120) {
    throw new TypeError("displayName must be 120 characters or fewer");
  }
  return normalized;
}

function normalizeRequestText(value: string): string {
  if (typeof value !== "string") {
    throw new TypeError("requestText must be a string");
  }
  const normalized = value.trim();
  if (normalized.length < 5 || normalized.length > 2000) {
    throw new TypeError("requestText must be between 5 and 2000 characters");
  }
  return normalized;
}

function normalizeOptionalTimestamp(
  value: number | null | undefined,
  fieldName: string,
): number | null {
  if (value == null) return null;
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${fieldName} must be a positive integer timestamp`);
  }
  return value;
}

function normalizePlanId(value: string): string {
  if (typeof value !== "string") {
    throw new TypeError("planId must be a string");
  }
  const planId = value.trim().toLowerCase();
  if (!DEMO_CASH_PLAN_IDS.has(planId)) {
    throw new TypeError(
      "planId must be one of: explore, investor, private",
    );
  }
  return planId;
}

function normalizeRequestId(value: string | null | undefined): string | null {
  if (value == null) return null;
  return validateOpaqueId(value, "requestId");
}

function getNow(options: Pick<WorkflowOptions, "now">): number {
  const now = options.now?.() ?? Date.now();
  if (!Number.isSafeInteger(now) || now <= 0) {
    throw new TypeError("now must return a positive integer timestamp");
  }
  return now;
}

function getRandomUUID(options: Pick<WorkflowOptions, "randomUUID">): string {
  const uuid = options.randomUUID?.() ?? globalThis.crypto?.randomUUID?.();
  if (
    !uuid ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      uuid,
    )
  ) {
    throw new Error("A valid random UUID generator is required");
  }
  return uuid.toLowerCase();
}
