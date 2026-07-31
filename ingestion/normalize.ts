import { createHash } from "node:crypto";

export type NormalizationInput = {
  country: string;
  city: string;
  district: string;
  transaction: "sale" | "rent";
  propertyType: "condo" | "house" | "villa";
  price: number;
  currency: "USD";
  areaSqm: number;
  bedrooms: number;
  bathrooms: number;
  imageUrl?: string | null;
  title: string;
  summary: string;
  sourceExternalKey: string;
  sourceUrl: string;
  observedAt: string;
};

export type NormalizedListing = {
  country: string;
  countryCode: string;
  city: string;
  district: string;
  transaction: "sale" | "rent";
  propertyType: "condo" | "house" | "villa";
  priceMinor: number;
  currency: "USD";
  areaSqmX100: number;
  bedrooms: number;
  bathrooms: number;
  imageUrl: string | null;
  title: string;
  summary: string;
  source: {
    externalKey: string;
    url: string;
  };
  observedAt: string;
  fingerprint: string;
  normalizedHash: string;
};

type CanonicalValue =
  | boolean
  | number
  | string
  | null
  | CanonicalValue[]
  | { [key: string]: CanonicalValue };

const COUNTRY_ALIASES = new Map(
  [
    ["bn", ["Brunei", "BN"]],
    ["brunei", ["Brunei", "BN"]],
    ["kh", ["Cambodia", "KH"]],
    ["cambodia", ["Cambodia", "KH"]],
    ["id", ["Indonesia", "ID"]],
    ["indonesia", ["Indonesia", "ID"]],
    ["la", ["Laos", "LA"]],
    ["laos", ["Laos", "LA"]],
    ["my", ["Malaysia", "MY"]],
    ["malaysia", ["Malaysia", "MY"]],
    ["mm", ["Myanmar", "MM"]],
    ["myanmar", ["Myanmar", "MM"]],
    ["ph", ["Philippines", "PH"]],
    ["philippines", ["Philippines", "PH"]],
    ["sg", ["Singapore", "SG"]],
    ["singapore", ["Singapore", "SG"]],
    ["th", ["Thailand", "TH"]],
    ["thailand", ["Thailand", "TH"]],
    ["tl", ["Timor-Leste", "TL"]],
    ["timor-leste", ["Timor-Leste", "TL"]],
    ["vn", ["Vietnam", "VN"]],
    ["vietnam", ["Vietnam", "VN"]],
  ] as const,
);

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_PATTERN = /(?:^|[^\d])\+?\d[\d\s().-]{6,}\d(?:$|[^\d])/;
const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function normalizeText(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== "string") {
    throw new TypeError(`${field} must be a string`);
  }

  const normalized = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (normalized.length < min || normalized.length > max) {
    throw new RangeError(`${field} must be between ${min} and ${max} characters`);
  }
  return normalized;
}

function normalizePublicText(
  value: unknown,
  field: "title" | "summary",
  min: number,
  max: number,
): string {
  const normalized = normalizeText(value, field, min, max);
  if (EMAIL_PATTERN.test(normalized) || PHONE_PATTERN.test(normalized)) {
    throw new Error(`${field} must not contain email addresses or phone numbers`);
  }
  return normalized;
}

function normalizeCountry(value: unknown): { country: string; countryCode: string } {
  const key = normalizeText(value, "country", 2, 60).toLocaleLowerCase("en-US");
  const country = COUNTRY_ALIASES.get(key);
  if (!country) {
    throw new RangeError("country must be a supported Southeast Asian country or ISO code");
  }
  return { country: country[0], countryCode: country[1] };
}

function normalizeEnum<const T extends string>(
  value: unknown,
  field: string,
  supported: readonly T[],
): T {
  if (typeof value !== "string" || !supported.includes(value as T)) {
    throw new RangeError(`${field} must be one of: ${supported.join(", ")}`);
  }
  return value as T;
}

function normalizeCount(value: unknown, field: string): number {
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > 100) {
    throw new RangeError(`${field} must be an integer between 0 and 100`);
  }
  return value as number;
}

function toScaledInteger(
  value: unknown,
  field: string,
  scale: number,
  maximum: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0 ||
    value > maximum
  ) {
    throw new RangeError(`${field} must be a positive finite number no greater than ${maximum}`);
  }

  const scaled = Math.round(value * scale);
  if (Math.abs(value * scale - scaled) > Number.EPSILON * Math.max(1, scaled) * 4) {
    throw new RangeError(`${field} must have no more than two decimal places`);
  }
  if (!Number.isSafeInteger(scaled)) {
    throw new RangeError(`${field} is outside the safe integer range`);
  }
  return scaled;
}

function normalizeSourceUrl(value: unknown): string {
  const raw = normalizeText(value, "sourceUrl", 10, 2_048);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new TypeError("sourceUrl must be an absolute URL");
  }

  if (url.protocol !== "https:" || url.username || url.password || url.hash) {
    throw new Error("sourceUrl must use HTTPS and contain no credentials or fragment");
  }

  for (const [key, parameterValue] of url.searchParams) {
    if (
      /^(?:contact|email|phone|tel|telephone|whatsapp)$/i.test(key) ||
      EMAIL_PATTERN.test(parameterValue)
    ) {
      throw new Error("sourceUrl must not contain contact information");
    }
  }

  return url.toString();
}

function normalizeImageUrl(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;

  const raw = normalizeText(value, "imageUrl", 10, 2_048);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new TypeError("imageUrl must be an absolute URL");
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.hash
  ) {
    throw new Error(
      "imageUrl must use HTTPS and contain no credentials or fragment",
    );
  }
  return url.toString();
}

function normalizeObservedAt(value: unknown): string {
  if (typeof value !== "string" || !ISO_TIMESTAMP_PATTERN.test(value)) {
    throw new TypeError("observedAt must be an ISO 8601 timestamp with a timezone");
  }
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new RangeError("observedAt must be a valid timestamp");
  }
  return new Date(timestamp).toISOString();
}

function canonicalize(value: CanonicalValue): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }

  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
    .join(",")}}`;
}

function hash(namespace: string, value: CanonicalValue): string {
  return createHash("sha256")
    .update(namespace)
    .update("\0")
    .update(canonicalize(value))
    .digest("hex");
}

export function normalizeApprovedFixture(input: unknown): NormalizedListing {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("listing input must be an object");
  }

  const candidate = input as Record<string, unknown>;
  const { country, countryCode } = normalizeCountry(candidate.country);
  const city = normalizeText(candidate.city, "city", 2, 100);
  const district = normalizeText(candidate.district, "district", 1, 120);
  const transaction = normalizeEnum(candidate.transaction, "transaction", [
    "sale",
    "rent",
  ] as const);
  const propertyType = normalizeEnum(candidate.propertyType, "propertyType", [
    "condo",
    "house",
    "villa",
  ] as const);
  const currency = normalizeEnum(candidate.currency, "currency", ["USD"] as const);
  const priceMinor = toScaledInteger(candidate.price, "price", 100, 100_000_000);
  const areaSqmX100 = toScaledInteger(candidate.areaSqm, "areaSqm", 100, 1_000_000);
  const bedrooms = normalizeCount(candidate.bedrooms, "bedrooms");
  const bathrooms = normalizeCount(candidate.bathrooms, "bathrooms");
  const imageUrl = normalizeImageUrl(candidate.imageUrl);
  const title = normalizePublicText(candidate.title, "title", 3, 200);
  const summary = normalizePublicText(candidate.summary, "summary", 10, 2_000);
  const externalKey = normalizeText(
    candidate.sourceExternalKey,
    "sourceExternalKey",
    1,
    256,
  );
  const url = normalizeSourceUrl(candidate.sourceUrl);
  const observedAt = normalizeObservedAt(candidate.observedAt);

  const fingerprint = hash("gli-listing-fingerprint:v1", {
    areaSqmX100,
    bedrooms,
    city: city.toLocaleLowerCase("en-US"),
    countryCode,
    district: district.toLocaleLowerCase("en-US"),
    priceMinor,
  });

  const publicPayload = {
    areaSqmX100,
    bathrooms,
    bedrooms,
    city,
    country,
    countryCode,
    currency,
    district,
    imageUrl,
    propertyType,
    source: { externalKey, url },
    summary,
    title,
    transaction,
    priceMinor,
  } satisfies CanonicalValue;

  return {
    country,
    countryCode,
    city,
    district,
    transaction,
    propertyType,
    priceMinor,
    currency,
    areaSqmX100,
    bedrooms,
    bathrooms,
    imageUrl,
    title,
    summary,
    source: { externalKey, url },
    observedAt,
    fingerprint,
    normalizedHash: hash("gli-normalized-listing:v1", publicPayload),
  };
}
