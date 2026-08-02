import { createHash } from "node:crypto";
import { parseFragment } from "parse5";
import type { CollectedListingBatch, RawObjectStore } from "./contracts.ts";
import type { NormalizationInput } from "./normalize.ts";
import {
  LICENSED_JSON_REQUESTED_FIELDS,
  validateApprovedPartnerUrl,
} from "./licensed-json-feed.ts";
import type { SourceConnector } from "./source-policy.ts";

export const WORDPRESS_PROPERTY_CONNECTOR_KIND =
  "WORDPRESS_PROPERTY_REFERENCE_V1";
export const WORDPRESS_PROPERTY_REQUESTED_FIELDS =
  LICENSED_JSON_REQUESTED_FIELDS;

const DEFAULT_MAX_BYTES = 8_000_000;
const DEFAULT_TIMEOUT_MS = 12_000;
const USER_AGENT = "GLI-Reference-Search/1.0";

type HtmlNode = {
  nodeName?: string;
  value?: string;
  childNodes?: HtmlNode[];
};

type WordPressProperty = {
  id?: unknown;
  modified_gmt?: unknown;
  link?: unknown;
  title?: { rendered?: unknown };
  property_meta?: Record<string, unknown>;
  _embedded?: Record<string, Array<Record<string, unknown>>>;
};

export type WordPressPropertyConnectorOptions = {
  sourceSlug: string;
  apiUrl: string;
  allowedHosts: readonly string[];
  maxRecords: number;
  rawStore: RawObjectStore;
  requiredLinkPathPrefix?: string;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  maxBytes?: number;
  timeoutMs?: number;
};

export function createWordPressPropertyConnector(
  options: WordPressPropertyConnectorOptions,
): SourceConnector<CollectedListingBatch> {
  const endpoint = validateApprovedPartnerUrl(
    options.apiUrl,
    options.allowedHosts,
    "apiUrl",
  );
  if (!/\/wp-json\/wp\/v2\/property\/?$/.test(endpoint.pathname)) {
    throw new RangeError("apiUrl must target the WordPress property endpoint");
  }
  const maxRecords = positiveInteger(options.maxRecords, "maxRecords", 100);
  const maxBytes = positiveInteger(
    options.maxBytes ?? DEFAULT_MAX_BYTES,
    "maxBytes",
    12_000_000,
  );
  const timeoutMs = positiveInteger(
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    "timeoutMs",
    30_000,
  );
  if (!options.rawStore || typeof options.rawStore.put !== "function") {
    throw new TypeError("rawStore must expose put()");
  }
  const requiredLinkPathPrefix = validateOptionalPathPrefix(
    options.requiredLinkPathPrefix,
  );
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => new Date());

  return {
    sourceSlug: options.sourceSlug,
    connectorKind: WORDPRESS_PROPERTY_CONNECTOR_KIND,
    endpoint: endpoint.toString(),
    requestedFields: WORDPRESS_PROPERTY_REQUESTED_FIELDS,
    async collect() {
      const fetchedAt = validNow(now()).getTime();
      const robotsUrl = new URL("/robots.txt", endpoint);
      const robotsResponse = await fetchImpl(robotsUrl, {
        headers: { accept: "text/plain", "user-agent": USER_AGENT },
        redirect: "error",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!robotsResponse.ok) {
        throw new Error(`Source robots policy returned HTTP ${robotsResponse.status}`);
      }
      assertRobotsPathAllowed(await robotsResponse.text(), endpoint.pathname);

      const response = await fetchImpl(endpoint, {
        headers: { accept: "application/json", "user-agent": USER_AGENT },
        redirect: "error",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.status === 403 || response.status === 429) {
        throw new Error(
          "Property API refused automated collection; source-side approval is required",
        );
      }
      if (!response.ok) {
        throw new Error(`Property API returned HTTP ${response.status}`);
      }
      const contentType = response.headers.get("content-type") ?? "";
      if (!/^application\/(?:[\w.+-]*\+)?json(?:\s*;|$)/i.test(contentType)) {
        throw new Error("Property API must return application/json");
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength > maxBytes) {
        throw new RangeError("Property API response exceeds the approved byte limit");
      }
      const records = parseWordPressPropertyResponse(bytes);
      const candidates = records
        .map((record) =>
          toWordPressNormalizationInput(
            record,
            options.allowedHosts,
            new Date(fetchedAt),
            requiredLinkPathPrefix,
          ),
        )
        .filter((value): value is NormalizationInput => value !== null)
        .slice(0, maxRecords);
      if (candidates.length === 0) {
        throw new RangeError("Property API contained no supported complete listings");
      }

      const contentHash = sha256(bytes);
      const sourceUrlHash = sha256(new TextEncoder().encode(endpoint.toString()));
      const objectKey = [
        "raw",
        options.sourceSlug,
        new Date(fetchedAt).toISOString().slice(0, 10),
        `${contentHash}.json`,
      ].join("/");
      await options.rawStore.put(objectKey, bytes, {
        httpMetadata: { contentType: "application/json" },
        customMetadata: {
          sourceSlug: options.sourceSlug,
          contentHash,
          fetchedAt: String(fetchedAt),
          collectionMode: "wordpress-reference-api",
        },
      });

      return {
        candidates,
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

export function parseWordPressPropertyResponse(
  bytes: Uint8Array,
): WordPressProperty[] {
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new TypeError("Property API body must be valid UTF-8 JSON");
  }
  if (!Array.isArray(value) || value.length === 0) {
    throw new RangeError("Property API must return a non-empty array");
  }
  return value as WordPressProperty[];
}

export function toWordPressNormalizationInput(
  record: WordPressProperty,
  allowedHosts: readonly string[],
  observedAt: Date,
  requiredLinkPathPrefix: string | null = null,
): NormalizationInput | null {
  if (!record || typeof record !== "object") return null;
  const externalId = integerString(record.id);
  const sourceUrl = safeSourceUrl(record.link, allowedHosts);
  if (
    !externalId ||
    !sourceUrl ||
    (requiredLinkPathPrefix && !sourceUrl.pathname.startsWith(requiredLinkPathPrefix))
  ) {
    return null;
  }
  const meta = record.property_meta;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;

  const title = htmlText(record.title?.rendered);
  const price = exactPositiveDecimal(meta.REAL_HOMES_property_price);
  const areaSqm = exactPositiveDecimal(meta.REAL_HOMES_property_size);
  const bedrooms = exactNonNegativeInteger(meta.REAL_HOMES_property_bedrooms);
  const bathrooms = exactNonNegativeInteger(meta.REAL_HOMES_property_bathrooms);
  const address = stringValue(meta.REAL_HOMES_property_address);
  const propertyType = propertyTypeFrom(
    `${stringValue(meta.REAL_HOMES_property_type) ?? ""} ${title}`,
  );
  const transaction = transactionFrom(
    `${sourceUrl.pathname} ${title} ${stringValue(meta.REAL_HOMES_property_price_postfix) ?? ""}`,
  );
  const place = address ? placeFrom(address) : null;
  const imageUrl = firstImageUrl(record, meta);

  if (
    !title ||
    !price ||
    !areaSqm ||
    bedrooms === null ||
    bathrooms === null ||
    !propertyType ||
    !transaction ||
    !place ||
    !imageUrl
  ) {
    return null;
  }

  return {
    country: "Cambodia",
    city: place.city,
    district: place.district,
    transaction,
    propertyType,
    price,
    currency: "USD",
    areaSqm,
    bedrooms,
    bathrooms,
    imageUrl,
    title,
    summary: `Public property reference in ${place.district}, ${place.city}. ${propertyType}, ${transaction}, ${areaSqm} sqm.`,
    sourceExternalKey: externalId,
    sourceUrl: sourceUrl.toString(),
    observedAt: validNow(observedAt).toISOString(),
  };
}

export function assertRobotsPathAllowed(
  robotsText: string,
  pathname: string,
): void {
  if (typeof robotsText !== "string" || typeof pathname !== "string") {
    throw new TypeError("robotsText and pathname must be strings");
  }
  const lines = robotsText.split(/\r?\n/).map((line) => line.replace(/\s+#.*$/, "").trim());
  let applies = false;
  const disallowed: string[] = [];
  const allowed: string[] = [];
  for (const line of lines) {
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLocaleLowerCase("en-US");
    const value = line.slice(separator + 1).trim();
    if (key === "user-agent") {
      applies = value === "*";
    } else if (applies && key === "disallow" && value) {
      disallowed.push(value);
    } else if (applies && key === "allow" && value) {
      allowed.push(value);
    }
  }
  const longestAllow = Math.max(
    0,
    ...allowed.filter((prefix) => pathname.startsWith(prefix)).map((value) => value.length),
  );
  const longestDisallow = Math.max(
    0,
    ...disallowed.filter((prefix) => pathname.startsWith(prefix)).map((value) => value.length),
  );
  if (longestDisallow > longestAllow) {
    throw new Error("Source robots policy disallows the configured API path");
  }
}

function safeSourceUrl(
  value: unknown,
  allowedHosts: readonly string[],
): URL | null {
  if (typeof value !== "string") return null;
  try {
    return validateApprovedPartnerUrl(value, allowedHosts, "sourceUrl");
  } catch {
    return null;
  }
}

function firstImageUrl(
  record: WordPressProperty,
  meta: Record<string, unknown>,
): string | null {
  const featured = record._embedded?.["wp:featuredmedia"]?.[0]?.source_url;
  if (typeof featured === "string" && /^https:\/\//.test(featured)) return featured;
  const images = meta.REAL_HOMES_property_images;
  if (!Array.isArray(images)) return null;
  const first = images.find((value) => value && typeof value === "object") as
    | Record<string, unknown>
    | undefined;
  const value = first?.full_url ?? first?.url;
  return typeof value === "string" && /^https:\/\//.test(value) ? value : null;
}

function placeFrom(address: string): { city: string; district: string } | null {
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  const city = ["Phnom Penh", "Siem Reap", "Preah Sihanouk", "Kampot", "Kep", "Kandal"]
    .find((candidate) => parts.some((part) => part.includes(candidate)));
  if (!city) return null;
  const districtPart = parts.find((part) => /^(?:Khan|Sangkat)\s+/i.test(part));
  const district = districtPart?.replace(/^(?:Khan|Sangkat)\s+/i, "") ?? parts[0];
  return district && district !== "Cambodia" ? { city, district } : null;
}

function transactionFrom(value: string): "sale" | "rent" | null {
  if (/\brent\b|per\s+month/i.test(value)) return "rent";
  if (/\bsale\b|for-sale|buy/i.test(value)) return "sale";
  return null;
}

function propertyTypeFrom(value: string): "condo" | "house" | "villa" | null {
  if (/condo|apartment|serviced/i.test(value)) return "condo";
  if (/villa/i.test(value)) return "villa";
  if (/house|townhouse|home|borey/i.test(value)) return "house";
  return null;
}

function htmlText(value: unknown): string {
  if (typeof value !== "string") return "";
  const fragment = parseFragment(value) as unknown as HtmlNode;
  return nodeText(fragment).normalize("NFKC").trim().replace(/\s+/g, " ");
}

function nodeText(node: HtmlNode): string {
  return `${node.nodeName === "#text" ? node.value ?? "" : ""}${
    (node.childNodes ?? []).map((child) => nodeText(child)).join("")
  }`;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function integerString(value: unknown): string | null {
  if (!Number.isSafeInteger(value) || (value as number) < 1) return null;
  return String(value);
}

function exactPositiveDecimal(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function exactNonNegativeInteger(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 100 ? parsed : null;
}

function validateOptionalPathPrefix(value: string | undefined): string | null {
  if (value === undefined) return null;
  if (!/^\/[a-z]{2}\/$/.test(value)) {
    throw new TypeError("requiredLinkPathPrefix must be a locale path such as /en/");
  }
  return value;
}

function positiveInteger(value: number, field: string, maximum: number): number {
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
