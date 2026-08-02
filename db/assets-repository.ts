import type { Asset, TrustStatus } from "../lib/assets";
import { isPriceCurrency } from "../lib/currency.ts";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const COUNTRY_CODES: Readonly<Record<string, string>> = {
  Cambodia: "KH",
  Indonesia: "ID",
  Malaysia: "MY",
  Philippines: "PH",
  Singapore: "SG",
  Thailand: "TH",
  Vietnam: "VN",
};

const TRANSACTIONS = new Set<Asset["transaction"]>(["sale", "rent"]);
const PROPERTY_TYPES = new Set<Asset["propertyType"]>([
  "condo",
  "house",
  "villa",
]);
const TRUST_STATUSES = new Set<TrustStatus>([
  "PRELIMINARY",
  "REVIEWING",
  "VERIFIED",
  "NEEDS_ATTENTION",
]);

const PUBLIC_SOURCE_NAMES: Readonly<Record<string, string>> = {
  "khmer24-cambodia": "Khmer24",
  "realestate-kh": "Realestate.com.kh",
  "fazwaz-kh": "FazWaz Cambodia",
  "cam-realty-cambodia": "CAM Realty",
  "cambodia-property-asia": "Cambodia Property Asia",
  "ips-cambodia": "IPS Cambodia",
};

export type PublicAssetsFilters = {
  country?: string;
  city?: string;
  transaction?: Asset["transaction"];
  propertyType?: Asset["propertyType"];
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  limit?: number;
};

/**
 * Query contract for an injected D1/Drizzle adapter.
 * Monetary bounds are expressed in minor units to match listings.price_minor.
 */
export type PublicAssetsQuery = {
  status: "ACTIVE";
  country?: string;
  city?: string;
  transactionType?: Asset["transaction"];
  propertyType?: Asset["propertyType"];
  minPriceMinor?: number;
  maxPriceMinor?: number;
  minBedrooms?: number;
  limit: number;
  orderBy: readonly [
    { field: "updatedAt"; direction: "desc" },
    { field: "trustScore"; direction: "desc" },
    { field: "priceMinor"; direction: "asc" },
    { field: "publicId"; direction: "asc" },
  ];
};

export type QueryPublicListingRows = (
  query: PublicAssetsQuery,
) => Promise<readonly unknown[]>;

export type AssetsRepository = {
  listPublicAssets(filters?: PublicAssetsFilters): Promise<Asset[]>;
};

type UnknownRecord = Record<string, unknown>;

export function createAssetsRepository(
  queryPublicListingRows: QueryPublicListingRows,
): AssetsRepository {
  if (typeof queryPublicListingRows !== "function") {
    throw new TypeError("queryPublicListingRows must be a function");
  }

  return {
    async listPublicAssets(filters = {}) {
      const query = buildPublicAssetsQuery(filters);
      const rows = await queryPublicListingRows(query);

      if (!Array.isArray(rows)) {
        throw new TypeError("The assets data source must return an array of rows");
      }

      return rows
        .map(mapListingRowToAsset)
        .filter((asset) => matchesPublicQuery(asset, query))
        .sort(comparePublicAssets)
        .slice(0, query.limit);
    },
  };
}

export function buildPublicAssetsQuery(
  filters: PublicAssetsFilters = {},
): PublicAssetsQuery {
  const limit = filters.limit ?? DEFAULT_LIMIT;

  assertOptionalText(filters.country, "country");
  assertOptionalText(filters.city, "city");
  assertOptionalFiniteNonNegative(filters.minPrice, "minPrice");
  assertOptionalFiniteNonNegative(filters.maxPrice, "maxPrice");
  assertOptionalIntegerNonNegative(filters.minBedrooms, "minBedrooms");

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new RangeError(`limit must be an integer between 1 and ${MAX_LIMIT}`);
  }
  if (
    filters.minPrice !== undefined &&
    filters.maxPrice !== undefined &&
    filters.minPrice > filters.maxPrice
  ) {
    throw new RangeError("minPrice cannot exceed maxPrice");
  }

  return {
    status: "ACTIVE",
    country: filters.country?.trim(),
    city: filters.city?.trim(),
    transactionType: filters.transaction,
    propertyType: filters.propertyType,
    minPriceMinor:
      filters.minPrice === undefined ? undefined : toMinorUnits(filters.minPrice),
    maxPriceMinor:
      filters.maxPrice === undefined ? undefined : toMinorUnits(filters.maxPrice),
    minBedrooms: filters.minBedrooms,
    limit,
    orderBy: [
      { field: "updatedAt", direction: "desc" },
      { field: "trustScore", direction: "desc" },
      { field: "priceMinor", direction: "asc" },
      { field: "publicId", direction: "asc" },
    ],
  };
}

export function mapListingRowToAsset(input: unknown): Asset {
  const row = asRecord(input, "listing row");
  const publicId = requiredText(read(row, "publicId", "public_id"), "publicId");
  const status = requiredText(read(row, "status"), "status", publicId);

  if (status !== "ACTIVE") {
    throw new Error(`Listing ${publicId} is not public: status is ${status}`);
  }

  const country = requiredText(read(row, "country"), "country", publicId);
  const countryCode =
    optionalText(read(row, "countryCode", "country_code"), "countryCode", publicId) ??
    COUNTRY_CODES[country];
  if (!countryCode || !/^[A-Z]{2}$/.test(countryCode)) {
    throw new Error(`Listing ${publicId} has no valid ISO country code`);
  }

  const transaction = requiredText(
    read(row, "transactionType", "transaction_type"),
    "transactionType",
    publicId,
  );
  if (!TRANSACTIONS.has(transaction as Asset["transaction"])) {
    throw new Error(`Listing ${publicId} has unsupported transactionType: ${transaction}`);
  }

  const propertyType = requiredText(
    read(row, "propertyType", "property_type"),
    "propertyType",
    publicId,
  );
  if (!PROPERTY_TYPES.has(propertyType as Asset["propertyType"])) {
    throw new Error(`Listing ${publicId} has unsupported propertyType: ${propertyType}`);
  }

  const currency = requiredText(read(row, "currency"), "currency", publicId);
  if (!isPriceCurrency(currency)) {
    throw new Error(`Listing ${publicId} has unsupported currency: ${currency}`);
  }

  const priceMinor = requiredInteger(
    read(row, "priceMinor", "price_minor"),
    "priceMinor",
    publicId,
  );
  const areaSqmX100 = nullableInteger(
    read(row, "areaSqmX100", "area_sqm_x100"),
    "areaSqmX100",
    publicId,
  );
  const updatedAt = requiredTimestamp(
    read(row, "updatedAt", "updated_at"),
    "updatedAt",
    publicId,
  );
  const sourceSlug = optionalText(
    read(row, "sourceSlug", "source_slug"),
    "sourceSlug",
    publicId,
  );
  const sourceUrl = optionalHttpsUrl(
    read(row, "sourceUrl", "source_url"),
    "sourceUrl",
    publicId,
  );
  if ((sourceSlug === null) !== (sourceUrl === null)) {
    throw new Error(
      `Listing ${publicId}: sourceSlug and sourceUrl must be provided together`,
    );
  }
  const sourceName = sourceSlug ? PUBLIC_SOURCE_NAMES[sourceSlug] : undefined;

  return {
    id: publicId,
    country,
    countryCode,
    city: requiredText(read(row, "city"), "city", publicId),
    district:
      optionalText(read(row, "district"), "district", publicId) ?? "",
    transaction: transaction as Asset["transaction"],
    propertyType: propertyType as Asset["propertyType"],
    bedrooms:
      nullableInteger(read(row, "bedrooms"), "bedrooms", publicId) ?? 0,
    bathrooms:
      nullableInteger(read(row, "bathrooms"), "bathrooms", publicId) ?? 0,
    title: requiredText(read(row, "title"), "title", publicId),
    price: priceMinor / 100,
    currency,
    areaSqm: areaSqmX100 === null ? 0 : areaSqmX100 / 100,
    image:
      optionalText(read(row, "imageUrl", "image_url"), "imageUrl", publicId) ?? "",
    summary: requiredText(read(row, "summary"), "summary", publicId),
    trustScore:
      nullableBoundedInteger(
        read(row, "trustScore", "trust_score"),
        "trustScore",
        publicId,
        0,
        100,
      ) ?? 0,
    trustStatus: readTrustStatus(row, publicId),
    isGliDirect: requiredBoolean(
      read(row, "isGliDirect", "is_gli_direct"),
      "isGliDirect",
      publicId,
    ),
    ...(sourceName && sourceUrl ? { sourceName, sourceUrl } : {}),
    updatedAt: updatedAt.toISOString(),
    strengths: readStringArray(row, "strengths", "strengthsJson", "strengths_json", publicId),
    checks: readStringArray(row, "checks", "checksJson", "checks_json", publicId),
  };
}

function matchesPublicQuery(asset: Asset, query: PublicAssetsQuery): boolean {
  const priceMinor = toMinorUnits(asset.price);

  return (
    (!query.country || asset.country === query.country) &&
    (!query.city || asset.city === query.city) &&
    (!query.transactionType || asset.transaction === query.transactionType) &&
    (!query.propertyType || asset.propertyType === query.propertyType) &&
    (query.minPriceMinor === undefined || priceMinor >= query.minPriceMinor) &&
    (query.maxPriceMinor === undefined || priceMinor <= query.maxPriceMinor) &&
    (query.minBedrooms === undefined || asset.bedrooms >= query.minBedrooms)
  );
}

function comparePublicAssets(left: Asset, right: Asset): number {
  return (
    Date.parse(right.updatedAt) - Date.parse(left.updatedAt) ||
    right.trustScore - left.trustScore ||
    left.price - right.price ||
    left.id.localeCompare(right.id)
  );
}

function readTrustStatus(row: UnknownRecord, publicId: string): TrustStatus {
  const value = read(row, "trustStatus", "trust_status");
  if (value === null || value === undefined) {
    return "PRELIMINARY";
  }
  if (typeof value !== "string" || !TRUST_STATUSES.has(value as TrustStatus)) {
    throw new Error(`Listing ${publicId} has unsupported trustStatus: ${String(value)}`);
  }
  return value as TrustStatus;
}

function readStringArray(
  row: UnknownRecord,
  directKey: string,
  camelJsonKey: string,
  snakeJsonKey: string,
  publicId: string,
): string[] {
  const value = read(row, directKey, camelJsonKey, snakeJsonKey);
  if (value === null || value === undefined) {
    return [];
  }

  let parsed: unknown = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new Error(`Listing ${publicId} has invalid ${directKey} JSON`);
    }
  }

  if (
    !Array.isArray(parsed) ||
    parsed.some((item) => typeof item !== "string" || item.trim() === "")
  ) {
    throw new Error(`Listing ${publicId} has invalid ${directKey}`);
  }
  return parsed.map((item) => item.trim());
}

function read(row: UnknownRecord, ...keys: string[]): unknown {
  for (const key of keys) {
    if (Object.hasOwn(row, key)) {
      return row[key];
    }
  }
  return undefined;
}

function asRecord(value: unknown, field: string): UnknownRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${field} must be an object`);
  }
  return value as UnknownRecord;
}

function requiredText(value: unknown, field: string, id?: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${listingPrefix(id)}${field} must be a non-empty string`);
  }
  return value.trim();
}

function optionalText(value: unknown, field: string, id?: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return requiredText(value, field, id);
}

function optionalHttpsUrl(value: unknown, field: string, id: string): string | null {
  const text = optionalText(value, field, id);
  if (text === null) return null;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new TypeError(`${listingPrefix(id)}${field} must be an absolute URL`);
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.hash
  ) {
    throw new TypeError(
      `${listingPrefix(id)}${field} must be a safe HTTPS URL`,
    );
  }
  return url.toString();
}

function requiredInteger(value: unknown, field: string, id?: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new TypeError(`${listingPrefix(id)}${field} must be a non-negative safe integer`);
  }
  return value as number;
}

function nullableInteger(value: unknown, field: string, id?: string): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  return requiredInteger(value, field, id);
}

function nullableBoundedInteger(
  value: unknown,
  field: string,
  id: string,
  min: number,
  max: number,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const number = requiredInteger(value, field, id);
  if (number < min || number > max) {
    throw new RangeError(`${listingPrefix(id)}${field} must be between ${min} and ${max}`);
  }
  return number;
}

function requiredBoolean(value: unknown, field: string, id: string): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === 0 || value === 1) {
    return value === 1;
  }
  throw new TypeError(`${listingPrefix(id)}${field} must be a boolean or 0/1`);
}

function requiredTimestamp(value: unknown, field: string, id: string): Date {
  const date =
    value instanceof Date
      ? new Date(value.getTime())
      : typeof value === "number" && Number.isFinite(value)
        ? new Date(value)
        : typeof value === "string" && value.trim() !== ""
          ? new Date(value)
          : null;

  if (!date || Number.isNaN(date.getTime())) {
    throw new TypeError(`${listingPrefix(id)}${field} must be a valid timestamp`);
  }
  return date;
}

function toMinorUnits(amount: number): number {
  const minor = Math.round(amount * 100);
  if (!Number.isSafeInteger(minor)) {
    throw new RangeError("price is outside the supported range");
  }
  return minor;
}

function assertOptionalText(value: unknown, field: string): void {
  if (value !== undefined) {
    requiredText(value, field);
  }
}

function assertOptionalFiniteNonNegative(value: unknown, field: string): void {
  if (
    value !== undefined &&
    (typeof value !== "number" || !Number.isFinite(value) || value < 0)
  ) {
    throw new RangeError(`${field} must be a finite non-negative number`);
  }
}

function assertOptionalIntegerNonNegative(value: unknown, field: string): void {
  if (value !== undefined && (!Number.isInteger(value) || (value as number) < 0)) {
    throw new RangeError(`${field} must be a non-negative integer`);
  }
}

function listingPrefix(id?: string): string {
  return id ? `Listing ${id}: ` : "";
}
