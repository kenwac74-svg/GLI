import { getMembershipPlan } from "../lib/membership-plans.ts";
import {
  activateDemoCashMembership,
  type D1DatabaseLike,
  type DashboardMembership,
  type WorkflowOptions,
} from "./user-workflows.ts";

const CHECKOUT_TTL_MS = 30 * 60 * 1000;

export type CashCheckoutSession = {
  id: string;
  userId: string;
  planId: string;
  amountMinor: number;
  currency: string;
  provider: string;
  providerSessionId: string | null;
  status: string;
  membershipId: string | null;
  expiresAt: number;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export type CashCheckoutProviderAdapter = {
  provider: string;
  createSession: (input: {
    referenceId: string;
    userId: string;
    planId: string;
    amountMinor: number;
    currency: string;
    expiresAt: number;
  }) => Promise<{
    providerSessionId: string;
    checkoutUrl: string;
    expiresAt: number;
  }>;
};

export type ProviderCashCheckout = {
  checkout: CashCheckoutSession;
  checkoutUrl: string;
};

export async function createCashCheckout(
  database: D1DatabaseLike,
  input: {
    userId: string;
    planId: string;
    requestId?: string | null;
  },
  options: WorkflowOptions = {},
): Promise<CashCheckoutSession> {
  assertDatabase(database);
  const userId = validateId(input.userId, "userId");
  const plan = getMembershipPlan(input.planId);
  await requireActiveUser(database, userId);
  const now = getNow(options);
  const id = `chk_${getRandomUUID(options)}`;
  const session: CashCheckoutSession = {
    id,
    userId,
    planId: plan.id,
    amountMinor: plan.price,
    currency: plan.currency,
    provider: "DEMO_CASH",
    providerSessionId: null,
    status: "PENDING",
    membershipId: null,
    expiresAt: now + CHECKOUT_TTL_MS,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await executeWrites(database, [
    database
      .prepare(
        `UPDATE cash_checkout_sessions
         SET status = 'CANCELLED', updated_at = ?
         WHERE user_id = ? AND status = 'PENDING'`,
      )
      .bind(now, userId),
    database
      .prepare(
        `INSERT INTO cash_checkout_sessions (
           id, user_id, plan_id, amount_minor, currency, provider,
           provider_session_id, status, membership_id, expires_at,
           completed_at, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, 'DEMO_CASH', NULL, 'PENDING', NULL, ?, NULL, ?, ?)`,
      )
      .bind(
        id,
        userId,
        plan.id,
        plan.price,
        plan.currency,
        session.expiresAt,
        now,
        now,
      ),
    auditStatement(database, {
      actorUserId: userId,
      action: "CASH_CHECKOUT_CREATED",
      resourceId: id,
      after: {
        planId: plan.id,
        amountMinor: plan.price,
        currency: plan.currency,
        provider: "DEMO_CASH",
        status: "PENDING",
      },
      requestId: input.requestId ?? options.requestId,
      createdAt: now,
    }),
  ]);
  return session;
}

export async function createProviderCashCheckout(
  database: D1DatabaseLike,
  input: {
    userId: string;
    planId: string;
    requestId?: string | null;
  },
  adapter: CashCheckoutProviderAdapter,
  options: WorkflowOptions = {},
): Promise<ProviderCashCheckout> {
  assertDatabase(database);
  if (!adapter || typeof adapter.createSession !== "function") {
    throw new TypeError("A cash checkout provider adapter is required");
  }

  const userId = validateId(input.userId, "userId");
  const provider = validateProvider(adapter.provider);
  const plan = getMembershipPlan(input.planId);
  await requireActiveUser(database, userId);
  const now = getNow(options);
  const id = `chk_${getRandomUUID(options)}`;
  const initialExpiresAt = now + CHECKOUT_TTL_MS;

  await executeWrites(database, [
    database
      .prepare(
        `UPDATE cash_checkout_sessions
         SET status = 'CANCELLED', updated_at = ?
         WHERE user_id = ? AND status IN ('CREATING', 'PENDING')`,
      )
      .bind(now, userId),
    database
      .prepare(
        `INSERT INTO cash_checkout_sessions (
           id, user_id, plan_id, amount_minor, currency, provider,
           provider_session_id, status, membership_id, expires_at,
           completed_at, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, NULL, 'CREATING', NULL, ?, NULL, ?, ?)`,
      )
      .bind(
        id,
        userId,
        plan.id,
        plan.price,
        plan.currency,
        provider,
        initialExpiresAt,
        now,
        now,
      ),
    auditStatement(database, {
      actorUserId: userId,
      action: "CASH_CHECKOUT_INITIALIZED",
      resourceId: id,
      after: {
        planId: plan.id,
        amountMinor: plan.price,
        currency: plan.currency,
        provider,
        status: "CREATING",
      },
      requestId: input.requestId ?? options.requestId,
      createdAt: now,
    }),
  ]);

  let providerSession: Awaited<
    ReturnType<CashCheckoutProviderAdapter["createSession"]>
  >;
  try {
    providerSession = await adapter.createSession({
      referenceId: id,
      userId,
      planId: plan.id,
      amountMinor: plan.price,
      currency: plan.currency,
      expiresAt: initialExpiresAt,
    });
    validateProviderSession(providerSession, now);
  } catch (error) {
    const failedAt = getNow(options);
    await executeWrites(database, [
      database
        .prepare(
          `UPDATE cash_checkout_sessions
           SET status = 'FAILED', updated_at = ?
           WHERE id = ? AND user_id = ? AND status = 'CREATING'`,
        )
        .bind(failedAt, id, userId),
      auditStatement(database, {
        actorUserId: userId,
        action: "CASH_CHECKOUT_PROVIDER_FAILED",
        resourceId: id,
        after: { provider, status: "FAILED" },
        requestId: input.requestId ?? options.requestId,
        createdAt: failedAt,
      }),
    ]);
    throw error;
  }

  const readyAt = getNow(options);
  await executeWrites(database, [
    database
      .prepare(
        `UPDATE cash_checkout_sessions
         SET provider_session_id = ?, status = 'PENDING',
             expires_at = ?, updated_at = ?
         WHERE id = ? AND user_id = ? AND status = 'CREATING'`,
      )
      .bind(
        providerSession.providerSessionId,
        providerSession.expiresAt,
        readyAt,
        id,
        userId,
      ),
    auditStatement(database, {
      actorUserId: userId,
      action: "CASH_CHECKOUT_PROVIDER_SESSION_CREATED",
      resourceId: id,
      after: {
        provider,
        providerSessionId: providerSession.providerSessionId,
        status: "PENDING",
        expiresAt: providerSession.expiresAt,
      },
      requestId: input.requestId ?? options.requestId,
      createdAt: readyAt,
    }),
  ]);

  return {
    checkout: {
      id,
      userId,
      planId: plan.id,
      amountMinor: plan.price,
      currency: plan.currency,
      provider,
      providerSessionId: providerSession.providerSessionId,
      status: "PENDING",
      membershipId: null,
      expiresAt: providerSession.expiresAt,
      completedAt: null,
      createdAt: now,
      updatedAt: readyAt,
    },
    checkoutUrl: providerSession.checkoutUrl,
  };
}

export async function getCashCheckout(
  database: D1DatabaseLike,
  checkoutId: string,
  userId: string,
): Promise<CashCheckoutSession | null> {
  assertDatabase(database);
  return database
    .prepare(
      `SELECT
         id,
         user_id AS userId,
         plan_id AS planId,
         amount_minor AS amountMinor,
         currency,
         provider,
         provider_session_id AS providerSessionId,
         status,
         membership_id AS membershipId,
         expires_at AS expiresAt,
         completed_at AS completedAt,
         created_at AS createdAt,
         updated_at AS updatedAt
       FROM cash_checkout_sessions
       WHERE id = ? AND user_id = ?
       LIMIT 1`,
    )
    .bind(validateId(checkoutId, "checkoutId"), validateId(userId, "userId"))
    .first<CashCheckoutSession>();
}

export async function completeDemoCashCheckout(
  database: D1DatabaseLike,
  input: {
    checkoutId: string;
    userId: string;
    requestId?: string | null;
  },
  options: WorkflowOptions = {},
): Promise<{
  checkout: CashCheckoutSession;
  membership: DashboardMembership;
  charged: false;
}> {
  assertDatabase(database);
  const checkoutId = validateId(input.checkoutId, "checkoutId");
  const userId = validateId(input.userId, "userId");
  const checkout = await getCashCheckout(database, checkoutId, userId);
  if (!checkout) throw new Error("Checkout session was not found");

  if (checkout.status === "COMPLETED" && checkout.membershipId) {
    const membership = await getMembership(database, checkout.membershipId, userId);
    if (!membership) throw new Error("Completed checkout membership was not found");
    return { checkout, membership, charged: false };
  }
  if (checkout.status !== "PENDING") {
    throw new TypeError("Checkout session is not pending");
  }

  const now = getNow(options);
  if (checkout.expiresAt <= now) {
    await database
      .prepare(
        `UPDATE cash_checkout_sessions
         SET status = 'EXPIRED', updated_at = ?
         WHERE id = ? AND user_id = ? AND status = 'PENDING'`,
      )
      .bind(now, checkoutId, userId)
      .run();
    throw new TypeError("Checkout session has expired");
  }

  const membership = await activateDemoCashMembership(
    database,
    {
      userId,
      planId: checkout.planId,
      requestId: input.requestId,
    },
    options,
  );
  await executeWrites(database, [
    database
      .prepare(
        `UPDATE cash_checkout_sessions
         SET status = 'COMPLETED', membership_id = ?,
             completed_at = ?, updated_at = ?
         WHERE id = ? AND user_id = ? AND status = 'PENDING'`,
      )
      .bind(membership.id, now, now, checkoutId, userId),
    auditStatement(database, {
      actorUserId: userId,
      action: "CASH_CHECKOUT_COMPLETED",
      resourceId: checkoutId,
      after: {
        membershipId: membership.id,
        planId: membership.planId,
        charged: false,
      },
      requestId: input.requestId ?? options.requestId,
      createdAt: now,
    }),
  ]);

  return {
    checkout: {
      ...checkout,
      status: "COMPLETED",
      membershipId: membership.id,
      completedAt: now,
      updatedAt: now,
    },
    membership,
    charged: false,
  };
}

async function getMembership(
  database: D1DatabaseLike,
  membershipId: string,
  userId: string,
): Promise<DashboardMembership | null> {
  return database
    .prepare(
      `SELECT
         id,
         plan_id AS planId,
         provider,
         status,
         period_start AS periodStart,
         period_end AS periodEnd,
         created_at AS createdAt,
         updated_at AS updatedAt
       FROM memberships
       WHERE id = ? AND user_id = ?
       LIMIT 1`,
    )
    .bind(membershipId, userId)
    .first<DashboardMembership>();
}

async function requireActiveUser(
  database: D1DatabaseLike,
  userId: string,
): Promise<void> {
  const user = await database
    .prepare("SELECT id, status FROM users WHERE id = ? LIMIT 1")
    .bind(userId)
    .first<{ id: string; status: string }>();
  if (!user) throw new Error("User was not found");
  if (user.status !== "ACTIVE") throw new Error("User is not active");
}

function auditStatement(
  database: D1DatabaseLike,
  input: {
    actorUserId: string;
    action: string;
    resourceId: string;
    after: unknown;
    requestId?: string | null;
    createdAt: number;
  },
) {
  return database
    .prepare(
      `INSERT INTO audit_logs (
         actor_user_id, action, resource_type, resource_id,
         before_json, after_json, request_id, created_at
       ) VALUES (?, ?, 'CASH_CHECKOUT', ?, NULL, ?, ?, ?)`,
    )
    .bind(
      input.actorUserId,
      input.action,
      input.resourceId,
      JSON.stringify(input.after),
      input.requestId ?? null,
      input.createdAt,
    );
}

async function executeWrites(
  database: D1DatabaseLike,
  statements: ReturnType<D1DatabaseLike["prepare"]>[],
): Promise<void> {
  if (database.batch) {
    const results = await database.batch(statements);
    if (results.some((result) => result.success === false)) {
      throw new Error("D1 batch write failed");
    }
    return;
  }
  for (const statement of statements) {
    const result = await statement.run();
    if (result.success === false) throw new Error("D1 write failed");
  }
}

function validateId(value: string, fieldName: string): string {
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

function validateProvider(value: string): string {
  if (
    typeof value !== "string" ||
    !/^[A-Z][A-Z0-9_]{1,31}$/.test(value) ||
    value === "DEMO_CASH"
  ) {
    throw new TypeError("provider is invalid");
  }
  return value;
}

function validateProviderSession(
  value: {
    providerSessionId: string;
    checkoutUrl: string;
    expiresAt: number;
  },
  now: number,
): void {
  if (
    typeof value?.providerSessionId !== "string" ||
    value.providerSessionId.length < 1 ||
    value.providerSessionId.length > 256 ||
    /[\u0000-\u001f\u007f]/.test(value.providerSessionId)
  ) {
    throw new TypeError("providerSessionId is invalid");
  }
  let checkoutUrl: URL;
  try {
    checkoutUrl = new URL(value.checkoutUrl);
  } catch {
    throw new TypeError("checkoutUrl must be an absolute URL");
  }
  if (
    checkoutUrl.protocol !== "https:" ||
    checkoutUrl.username ||
    checkoutUrl.password ||
    checkoutUrl.hash
  ) {
    throw new TypeError(
      "checkoutUrl must use HTTPS and contain no credentials or fragment",
    );
  }
  if (
    !Number.isSafeInteger(value.expiresAt) ||
    value.expiresAt <= now ||
    value.expiresAt > now + 24 * 60 * 60 * 1000
  ) {
    throw new RangeError(
      "provider checkout expiry must be within the next 24 hours",
    );
  }
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

function assertDatabase(
  database: D1DatabaseLike,
): asserts database is D1DatabaseLike {
  if (!database || typeof database.prepare !== "function") {
    throw new TypeError("A D1 database binding is required");
  }
}
