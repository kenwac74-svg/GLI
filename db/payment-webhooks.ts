import { createHash } from "node:crypto";
import type { D1DatabaseLike, WorkflowOptions } from "./user-workflows.ts";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_WEBHOOK_BYTES = 1_000_000;

export const PAYMENT_EVENT_TYPES = [
  "CHECKOUT_COMPLETED",
  "PAYMENT_REFUNDED",
  "CHECKOUT_EXPIRED",
] as const;

export type PaymentEventType = (typeof PAYMENT_EVENT_TYPES)[number];

export type VerifiedPaymentEvent = {
  providerEventId: string;
  type: PaymentEventType;
  providerSessionId: string;
  occurredAt: number;
  amountMinor?: number;
  currency?: string;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
};

export type PaymentWebhookVerifier = {
  provider: string;
  verify: (input: {
    rawBody: Uint8Array;
    headers: Readonly<Record<string, string>>;
  }) => Promise<VerifiedPaymentEvent>;
};

export type PaymentWebhookResult = {
  provider: string;
  providerEventId: string;
  eventType: PaymentEventType;
  checkoutId: string;
  checkoutStatus: string;
  membershipId: string | null;
  duplicate: boolean;
};

export type PaymentEventSummary = {
  id: number;
  provider: string;
  providerEventId: string;
  eventType: string;
  status: string;
  checkoutId: string | null;
  errorSummary: string | null;
  receivedAt: number;
  processedAt: number | null;
};

type CheckoutRow = {
  id: string;
  userId: string;
  planId: string;
  amountMinor: number;
  currency: string;
  provider: string;
  providerSessionId: string;
  status: string;
  membershipId: string | null;
  expiresAt: number;
};

type WebhookRow = {
  id: number;
  provider: string;
  providerEventId: string;
  eventType: string;
  payloadHash: string;
  status: string;
  checkoutId: string | null;
};

export async function processPaymentWebhook(
  database: D1DatabaseLike,
  input: {
    rawBody: Uint8Array;
    headers: Readonly<Record<string, string>>;
    verifier: PaymentWebhookVerifier;
    requestId?: string | null;
  },
  options: WorkflowOptions = {},
): Promise<PaymentWebhookResult> {
  assertDatabase(database);
  const provider = validateProvider(input.verifier?.provider);
  if (typeof input.verifier?.verify !== "function") {
    throw new TypeError("Payment webhook verifier must expose verify()");
  }
  if (
    !(input.rawBody instanceof Uint8Array) ||
    input.rawBody.byteLength < 1 ||
    input.rawBody.byteLength > MAX_WEBHOOK_BYTES
  ) {
    throw new RangeError(
      `rawBody must contain between 1 and ${MAX_WEBHOOK_BYTES} bytes`,
    );
  }
  if (!input.headers || typeof input.headers !== "object") {
    throw new TypeError("headers must be an object");
  }

  const receivedAt = getNow(options);
  const event = validateEvent(
    await input.verifier.verify({
      rawBody: input.rawBody,
      headers: input.headers,
    }),
    receivedAt,
  );
  const payloadHash = createHash("sha256").update(input.rawBody).digest("hex");

  await database
    .prepare(
      `INSERT OR IGNORE INTO payment_webhook_events (
         provider, provider_event_id, event_type, payload_hash, status,
         checkout_id, error_summary, received_at, processed_at, updated_at
       ) VALUES (?, ?, ?, ?, 'RECEIVED', NULL, NULL, ?, NULL, ?)`,
    )
    .bind(
      provider,
      event.providerEventId,
      event.type,
      payloadHash,
      receivedAt,
      receivedAt,
    )
    .run();

  const webhook = await getWebhook(database, provider, event.providerEventId);
  if (!webhook) throw new Error("Failed to record payment webhook event");
  if (webhook.payloadHash !== payloadHash || webhook.eventType !== event.type) {
    throw new Error("Webhook event identifier was reused with different data");
  }

  const existingCheckout = webhook.checkoutId
    ? await getCheckoutById(database, webhook.checkoutId)
    : null;
  if (webhook.status === "PROCESSED" && existingCheckout) {
    return resultFromCheckout(provider, event, existingCheckout, true);
  }

  await database
    .prepare(
      `UPDATE payment_webhook_events
       SET status = 'PROCESSING', error_summary = NULL, updated_at = ?
       WHERE id = ?`,
    )
    .bind(receivedAt, webhook.id)
    .run();

  let checkout: CheckoutRow | null = null;
  try {
    checkout = await getCheckoutByProviderSession(
      database,
      provider,
      event.providerSessionId,
    );
    if (!checkout) {
      throw new Error("Payment checkout session was not found");
    }

    if (event.type === "CHECKOUT_COMPLETED") {
      checkout = await completeProviderCheckout(
        database,
        checkout,
        event,
        input.requestId ?? options.requestId,
        options,
      );
    } else if (event.type === "PAYMENT_REFUNDED") {
      checkout = await refundProviderCheckout(
        database,
        checkout,
        event,
        input.requestId ?? options.requestId,
      );
    } else {
      checkout = await expireProviderCheckout(
        database,
        checkout,
        event,
        input.requestId ?? options.requestId,
      );
    }

    const processedAt = getNow(options);
    await database
      .prepare(
        `UPDATE payment_webhook_events
         SET status = 'PROCESSED', checkout_id = ?, processed_at = ?,
             error_summary = NULL, updated_at = ?
         WHERE id = ?`,
      )
      .bind(checkout.id, processedAt, processedAt, webhook.id)
      .run();
    return resultFromCheckout(provider, event, checkout, false);
  } catch (error) {
    const failedAt = getNow(options);
    await database
      .prepare(
        `UPDATE payment_webhook_events
         SET status = 'FAILED', checkout_id = ?, error_summary = ?,
             updated_at = ?
         WHERE id = ?`,
      )
      .bind(
        checkout?.id ?? null,
        error instanceof Error ? error.message.slice(0, 2_000) : "Unknown error",
        failedAt,
        webhook.id,
      )
      .run();
    throw error;
  }
}

export async function listRecentPaymentEvents(
  database: D1DatabaseLike,
  limit = 20,
): Promise<PaymentEventSummary[]> {
  assertDatabase(database);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new RangeError("limit must be an integer between 1 and 100");
  }
  const rows = await database
    .prepare(
      `SELECT
         id,
         provider,
         provider_event_id AS providerEventId,
         event_type AS eventType,
         status,
         checkout_id AS checkoutId,
         error_summary AS errorSummary,
         received_at AS receivedAt,
         processed_at AS processedAt
       FROM payment_webhook_events
       ORDER BY received_at DESC, id DESC
       LIMIT ?`,
    )
    .bind(limit)
    .all<PaymentEventSummary>();
  return rows.results ?? [];
}

async function completeProviderCheckout(
  database: D1DatabaseLike,
  checkout: CheckoutRow,
  event: VerifiedPaymentEvent,
  requestId: string | null | undefined,
  options: WorkflowOptions,
): Promise<CheckoutRow> {
  assertPaymentMatches(checkout, event, true);
  if (checkout.status === "COMPLETED" && checkout.membershipId) return checkout;
  if (checkout.status !== "PENDING") {
    throw new Error(`Checkout cannot complete from ${checkout.status}`);
  }
  if (event.occurredAt > checkout.expiresAt) {
    throw new Error("Checkout completed after its approved expiry");
  }

  const membershipId = `mem_${getRandomUUID(options)}`;
  const periodEnd = event.occurredAt + THIRTY_DAYS_MS;
  await executeWrites(database, [
    database
      .prepare(
        `UPDATE memberships
         SET status = 'REPLACED', updated_at = ?
         WHERE user_id = ? AND status = 'ACTIVE'`,
      )
      .bind(event.occurredAt, checkout.userId),
    database
      .prepare(
        `INSERT INTO memberships (
           id, user_id, plan_id, provider, provider_customer_id,
           provider_subscription_id, status, period_start, period_end,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?)`,
      )
      .bind(
        membershipId,
        checkout.userId,
        checkout.planId,
        checkout.provider,
        event.providerCustomerId ?? null,
        event.providerSubscriptionId ?? null,
        event.occurredAt,
        periodEnd,
        event.occurredAt,
        event.occurredAt,
      ),
    database
      .prepare(
        `UPDATE cash_checkout_sessions
         SET status = 'COMPLETED', membership_id = ?,
             completed_at = ?, updated_at = ?
         WHERE id = ? AND status = 'PENDING'`,
      )
      .bind(
        membershipId,
        event.occurredAt,
        event.occurredAt,
        checkout.id,
      ),
    auditStatement(database, {
      actorUserId: checkout.userId,
      action: "CASH_MEMBERSHIP_ACTIVATED",
      resourceType: "MEMBERSHIP",
      resourceId: membershipId,
      after: {
        checkoutId: checkout.id,
        planId: checkout.planId,
        provider: checkout.provider,
        status: "ACTIVE",
        periodStart: event.occurredAt,
        periodEnd,
        charged: true,
      },
      requestId,
      createdAt: event.occurredAt,
    }),
    auditStatement(database, {
      actorUserId: checkout.userId,
      action: "CASH_CHECKOUT_COMPLETED",
      resourceType: "CASH_CHECKOUT",
      resourceId: checkout.id,
      after: {
        provider: checkout.provider,
        membershipId,
        amountMinor: checkout.amountMinor,
        currency: checkout.currency,
        charged: true,
      },
      requestId,
      createdAt: event.occurredAt,
    }),
  ]);

  return {
    ...checkout,
    status: "COMPLETED",
    membershipId,
  };
}

async function refundProviderCheckout(
  database: D1DatabaseLike,
  checkout: CheckoutRow,
  event: VerifiedPaymentEvent,
  requestId: string | null | undefined,
): Promise<CheckoutRow> {
  assertPaymentMatches(checkout, event, false);
  if (checkout.status === "REFUNDED") return checkout;
  if (checkout.status !== "COMPLETED" || !checkout.membershipId) {
    throw new Error("Only a completed checkout can be refunded");
  }

  await executeWrites(database, [
    database
      .prepare(
        `UPDATE memberships
         SET status = 'REFUNDED',
             period_end = CASE WHEN period_end > ? THEN ? ELSE period_end END,
             updated_at = ?
         WHERE id = ? AND user_id = ?`,
      )
      .bind(
        event.occurredAt,
        event.occurredAt,
        event.occurredAt,
        checkout.membershipId,
        checkout.userId,
      ),
    database
      .prepare(
        `UPDATE cash_checkout_sessions
         SET status = 'REFUNDED', updated_at = ?
         WHERE id = ? AND status = 'COMPLETED'`,
      )
      .bind(event.occurredAt, checkout.id),
    auditStatement(database, {
      actorUserId: checkout.userId,
      action: "CASH_MEMBERSHIP_REFUNDED",
      resourceType: "MEMBERSHIP",
      resourceId: checkout.membershipId,
      after: {
        checkoutId: checkout.id,
        provider: checkout.provider,
        status: "REFUNDED",
        accessEndedAt: event.occurredAt,
      },
      requestId,
      createdAt: event.occurredAt,
    }),
  ]);

  return { ...checkout, status: "REFUNDED" };
}

async function expireProviderCheckout(
  database: D1DatabaseLike,
  checkout: CheckoutRow,
  event: VerifiedPaymentEvent,
  requestId: string | null | undefined,
): Promise<CheckoutRow> {
  if (checkout.status === "EXPIRED") return checkout;
  if (checkout.status !== "PENDING" && checkout.status !== "CREATING") {
    return checkout;
  }

  await executeWrites(database, [
    database
      .prepare(
        `UPDATE cash_checkout_sessions
         SET status = 'EXPIRED', updated_at = ?
         WHERE id = ? AND status IN ('CREATING', 'PENDING')`,
      )
      .bind(event.occurredAt, checkout.id),
    auditStatement(database, {
      actorUserId: checkout.userId,
      action: "CASH_CHECKOUT_EXPIRED",
      resourceType: "CASH_CHECKOUT",
      resourceId: checkout.id,
      after: { provider: checkout.provider, status: "EXPIRED" },
      requestId,
      createdAt: event.occurredAt,
    }),
  ]);
  return { ...checkout, status: "EXPIRED" };
}

function assertPaymentMatches(
  checkout: CheckoutRow,
  event: VerifiedPaymentEvent,
  required: boolean,
): void {
  if (required && (event.amountMinor === undefined || event.currency === undefined)) {
    throw new Error("Completed payment event must include amount and currency");
  }
  if (
    event.amountMinor !== undefined &&
    event.amountMinor !== checkout.amountMinor
  ) {
    throw new Error("Payment amount does not match the checkout");
  }
  if (
    event.currency !== undefined &&
    event.currency.toUpperCase() !== checkout.currency
  ) {
    throw new Error("Payment currency does not match the checkout");
  }
}

async function getWebhook(
  database: D1DatabaseLike,
  provider: string,
  providerEventId: string,
): Promise<WebhookRow | null> {
  return database
    .prepare(
      `SELECT
         id,
         provider,
         provider_event_id AS providerEventId,
         event_type AS eventType,
         payload_hash AS payloadHash,
         status,
         checkout_id AS checkoutId
       FROM payment_webhook_events
       WHERE provider = ? AND provider_event_id = ?
       LIMIT 1`,
    )
    .bind(provider, providerEventId)
    .first<WebhookRow>();
}

async function getCheckoutByProviderSession(
  database: D1DatabaseLike,
  provider: string,
  providerSessionId: string,
): Promise<CheckoutRow | null> {
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
         expires_at AS expiresAt
       FROM cash_checkout_sessions
       WHERE provider = ? AND provider_session_id = ?
       LIMIT 1`,
    )
    .bind(provider, providerSessionId)
    .first<CheckoutRow>();
}

async function getCheckoutById(
  database: D1DatabaseLike,
  checkoutId: string,
): Promise<CheckoutRow | null> {
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
         expires_at AS expiresAt
       FROM cash_checkout_sessions
       WHERE id = ?
       LIMIT 1`,
    )
    .bind(checkoutId)
    .first<CheckoutRow>();
}

function resultFromCheckout(
  provider: string,
  event: VerifiedPaymentEvent,
  checkout: CheckoutRow,
  duplicate: boolean,
): PaymentWebhookResult {
  return {
    provider,
    providerEventId: event.providerEventId,
    eventType: event.type,
    checkoutId: checkout.id,
    checkoutStatus: checkout.status,
    membershipId: checkout.membershipId,
    duplicate,
  };
}

function validateEvent(
  event: VerifiedPaymentEvent,
  receivedAt: number,
): VerifiedPaymentEvent {
  if (!event || typeof event !== "object") {
    throw new TypeError("Verified payment event is required");
  }
  const providerEventId = validateOpaqueId(
    event.providerEventId,
    "providerEventId",
  );
  const providerSessionId = validateOpaqueId(
    event.providerSessionId,
    "providerSessionId",
  );
  if (!PAYMENT_EVENT_TYPES.includes(event.type)) {
    throw new RangeError("Payment event type is not supported");
  }
  if (
    !Number.isSafeInteger(event.occurredAt) ||
    event.occurredAt <= 0 ||
    event.occurredAt > receivedAt + 5 * 60 * 1000
  ) {
    throw new RangeError("Payment event occurredAt is invalid");
  }
  if (
    event.amountMinor !== undefined &&
    (!Number.isSafeInteger(event.amountMinor) || event.amountMinor < 0)
  ) {
    throw new RangeError("Payment event amountMinor is invalid");
  }
  if (
    event.currency !== undefined &&
    !/^[A-Z]{3}$/.test(event.currency)
  ) {
    throw new TypeError("Payment event currency is invalid");
  }

  return {
    ...event,
    providerEventId,
    providerSessionId,
  };
}

function validateProvider(value: string): string {
  if (
    typeof value !== "string" ||
    !/^[A-Z][A-Z0-9_]{1,31}$/.test(value) ||
    value === "DEMO_CASH"
  ) {
    throw new TypeError("Payment webhook provider is invalid");
  }
  return value;
}

function validateOpaqueId(value: string, field: string): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 256 ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new TypeError(`${field} is invalid`);
  }
  return value;
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

function auditStatement(
  database: D1DatabaseLike,
  input: {
    actorUserId: string;
    action: string;
    resourceType: string;
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
       ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?)`,
    )
    .bind(
      input.actorUserId,
      input.action,
      input.resourceType,
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

function assertDatabase(
  database: D1DatabaseLike,
): asserts database is D1DatabaseLike {
  if (!database || typeof database.prepare !== "function") {
    throw new TypeError("A D1 database binding is required");
  }
}
