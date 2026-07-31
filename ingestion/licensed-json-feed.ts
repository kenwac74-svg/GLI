import { createHash } from "node:crypto";
import type { CollectedListingBatch, RawObjectStore } from "./contracts.ts";
import type { NormalizationInput } from "./normalize.ts";
import type { SourceConnector } from "./source-policy.ts";

export const LICENSED_JSON_CONNECTOR_KIND = "LICENSED_JSON_V1";

export const LICENSED_JSON_REQUESTED_FIELDS = [
  "externalId",
  "country",
  "city",
  "district",
  "transaction",
  "propertyType",
  "price",
  "currency",
  "areaSqm",
  "bedrooms",
  "bathrooms",
  "imageUrl",
  "title",
  "summary",
  "sourceUrl",
  "observedAt",
] as const;

const DEFAULT_MAX_BYTES = 2_000_000;
const DEFAULT_TIMEOUT_MS = 10_000;

type LicensedFeedEnvelope = {
  schemaVersion: "gli.partner-listings.v1";
  sourceSlug: string;
  generatedAt: string;
  listings: unknown[];
};

export type LicensedJsonFeedConnectorOptions = {
  sourceSlug: string;
  feedUrl: string;
  allowedHosts: readonly string[];
  maxRecords: number;
  rawStore: RawObjectStore;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  maxBytes?: number;
  timeoutMs?: number;
  authorizationHeader?: string;
};

export type UploadedLicensedJsonFeedOptions = {
  sourceSlug: string;
  feedUrl: string;
  allowedHosts: readonly string[];
  maxRecords: number;
  rawStore: RawObjectStore;
  bytes: Uint8Array;
  now?: () => Date;
  maxBytes?: number;
};

export function createLicensedJsonFeedConnector(
  options: LicensedJsonFeedConnectorOptions,
): SourceConnector<CollectedListingBatch> {
  const endpoint = validateApprovedPartnerUrl(
    options.feedUrl,
    options.allowedHosts,
    "feedUrl",
  );
  const maxRecords = validatePositiveInteger(
    options.maxRecords,
    "maxRecords",
    1_000,
  );
  const maxBytes = validatePositiveInteger(
    options.maxBytes ?? DEFAULT_MAX_BYTES,
    "maxBytes",
    10_000_000,
  );
  const timeoutMs = validatePositiveInteger(
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    "timeoutMs",
    30_000,
  );
  if (!options.rawStore || typeof options.rawStore.put !== "function") {
    throw new TypeError("rawStore must expose put()");
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => new Date());

  return {
    sourceSlug: options.sourceSlug,
    connectorKind: LICENSED_JSON_CONNECTOR_KIND,
    endpoint: endpoint.toString(),
    requestedFields: LICENSED_JSON_REQUESTED_FIELDS,
    async collect() {
      const fetchedAt = validNow(now()).getTime();
      const headers = new Headers({
        accept: "application/json",
        "user-agent": "GLI-Authorized-Partner-Feed/1.0",
      });
      if (options.authorizationHeader) {
        headers.set("authorization", options.authorizationHeader);
      }

      const response = await fetchImpl(endpoint, {
        method: "GET",
        headers,
        redirect: "error",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) {
        throw new Error(`Partner feed returned HTTP ${response.status}`);
      }
      const contentType = response.headers.get("content-type") ?? "";
      if (!/^application\/(?:[\w.+-]*\+)?json(?:\s*;|$)/i.test(contentType)) {
        throw new Error("Partner feed must return application/json");
      }

      const declaredLength = Number(response.headers.get("content-length"));
      if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
        throw new RangeError("Partner feed exceeds the approved byte limit");
      }

      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength > maxBytes) {
        throw new RangeError("Partner feed exceeds the approved byte limit");
      }

      const contentHash = sha256(bytes);
      const sourceUrlHash = sha256(new TextEncoder().encode(endpoint.toString()));
      const objectKey = [
        "raw",
        options.sourceSlug,
        new Date(fetchedAt).toISOString().slice(0, 10),
        `${contentHash}.json`,
      ].join("/");
      const envelope = parseEnvelope(bytes, options.sourceSlug, maxRecords);

      await options.rawStore.put(objectKey, bytes, {
        httpMetadata: { contentType: "application/json" },
        customMetadata: {
          sourceSlug: options.sourceSlug,
          contentHash,
          fetchedAt: String(fetchedAt),
        },
      });

      return {
        candidates: envelope.listings.map((listing) =>
          toLicensedPartnerNormalizationInput(listing, options.allowedHosts),
        ),
        snapshot: {
          sourceUrl: endpoint.toString(),
          sourceUrlHash,
          contentHash,
          objectKey,
          httpStatus: response.status,
          fetchedAt,
        },
      };
    },
  };
}

export function createUploadedLicensedJsonFeedConnector(
  options: UploadedLicensedJsonFeedOptions,
): SourceConnector<CollectedListingBatch> {
  const endpoint = validateApprovedPartnerUrl(
    options.feedUrl,
    options.allowedHosts,
    "feedUrl",
  );
  const maxRecords = validatePositiveInteger(
    options.maxRecords,
    "maxRecords",
    1_000,
  );
  const maxBytes = validatePositiveInteger(
    options.maxBytes ?? DEFAULT_MAX_BYTES,
    "maxBytes",
    10_000_000,
  );
  if (!options.rawStore || typeof options.rawStore.put !== "function") {
    throw new TypeError("rawStore must expose put()");
  }
  if (!(options.bytes instanceof Uint8Array)) {
    throw new TypeError("bytes must be a Uint8Array");
  }
  if (options.bytes.byteLength < 2 || options.bytes.byteLength > maxBytes) {
    throw new RangeError("Uploaded partner feed exceeds the approved byte limit");
  }

  const now = options.now ?? (() => new Date());
  return {
    sourceSlug: options.sourceSlug,
    connectorKind: LICENSED_JSON_CONNECTOR_KIND,
    endpoint: endpoint.toString(),
    requestedFields: LICENSED_JSON_REQUESTED_FIELDS,
    async collect() {
      const fetchedAt = validNow(now()).getTime();
      const contentHash = sha256(options.bytes);
      const sourceUrlHash = sha256(
        new TextEncoder().encode(endpoint.toString()),
      );
      const objectKey = [
        "raw",
        options.sourceSlug,
        new Date(fetchedAt).toISOString().slice(0, 10),
        `${contentHash}.json`,
      ].join("/");
      const envelope = parseEnvelope(
        options.bytes,
        options.sourceSlug,
        maxRecords,
      );

      await options.rawStore.put(objectKey, options.bytes, {
        httpMetadata: { contentType: "application/json" },
        customMetadata: {
          sourceSlug: options.sourceSlug,
          contentHash,
          fetchedAt: String(fetchedAt),
          collectionMode: "manual-upload",
        },
      });

      return {
        candidates: envelope.listings.map((listing) =>
          toLicensedPartnerNormalizationInput(listing, options.allowedHosts),
        ),
        snapshot: {
          sourceUrl: endpoint.toString(),
          sourceUrlHash,
          contentHash,
          objectKey,
          httpStatus: 200,
          fetchedAt,
        },
      };
    },
  };
}

export function validateApprovedPartnerUrl(
  value: string,
  allowedHosts: readonly string[],
  field: string,
): URL {
  if (typeof value !== "string" || !value || value.trim() !== value) {
    throw new TypeError(`${field} must be a non-empty, trimmed string`);
  }
  if (!Array.isArray(allowedHosts) || allowedHosts.length === 0) {
    throw new TypeError("allowedHosts must contain at least one hostname");
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError(`${field} must be an absolute URL`);
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.hash
  ) {
    throw new TypeError(
      `${field} must use HTTPS and contain no credentials or fragment`,
    );
  }

  const allowed = new Set(
    allowedHosts.map((host) => host.toLocaleLowerCase("en-US")),
  );
  if (!allowed.has(url.hostname.toLocaleLowerCase("en-US"))) {
    throw new Error(`${field} hostname is not in the approved allowlist`);
  }
  return url;
}

function parseEnvelope(
  bytes: Uint8Array,
  sourceSlug: string,
  maxRecords: number,
): LicensedFeedEnvelope {
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new TypeError("Partner feed body must be valid UTF-8 JSON");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Partner feed must be an object envelope");
  }

  const envelope = value as Record<string, unknown>;
  if (envelope.schemaVersion !== "gli.partner-listings.v1") {
    throw new RangeError("Partner feed schemaVersion is not supported");
  }
  if (envelope.sourceSlug !== sourceSlug) {
    throw new Error("Partner feed sourceSlug does not match the connector");
  }
  if (
    typeof envelope.generatedAt !== "string" ||
    !Number.isFinite(Date.parse(envelope.generatedAt))
  ) {
    throw new TypeError("Partner feed generatedAt must be a valid timestamp");
  }
  if (!Array.isArray(envelope.listings) || envelope.listings.length === 0) {
    throw new RangeError("Partner feed must contain at least one listing");
  }
  if (envelope.listings.length > maxRecords) {
    throw new RangeError("Partner feed exceeds the approved record limit");
  }

  return envelope as LicensedFeedEnvelope;
}

export function toLicensedPartnerNormalizationInput(
  value: unknown,
  allowedHosts: readonly string[],
): NormalizationInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Each partner listing must be an object");
  }
  const listing = value as Record<string, unknown>;

  const sourceUrl = validateApprovedPartnerUrl(
    listing.sourceUrl as string,
    allowedHosts,
    "sourceUrl",
  ).toString();

  return {
    country: listing.country as string,
    city: listing.city as string,
    district: listing.district as string,
    transaction: listing.transaction as NormalizationInput["transaction"],
    propertyType:
      listing.propertyType as NormalizationInput["propertyType"],
    price: listing.price as number,
    currency: listing.currency as "USD",
    areaSqm: listing.areaSqm as number,
    bedrooms: listing.bedrooms as number,
    bathrooms: listing.bathrooms as number,
    imageUrl: listing.imageUrl as string | null | undefined,
    title: listing.title as string,
    summary: listing.summary as string,
    sourceExternalKey: listing.externalId as string,
    sourceUrl,
    observedAt: listing.observedAt as string,
  };
}

function validatePositiveInteger(
  value: number,
  field: string,
  maximum: number,
): number {
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    throw new RangeError(`${field} must be an integer between 1 and ${maximum}`);
  }
  return value;
}

function validNow(value: Date): Date {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new TypeError("now must return a valid Date");
  }
  return value;
}

function sha256(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

