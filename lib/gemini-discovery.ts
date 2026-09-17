import { createHash } from "node:crypto";
import type { Asset } from "./assets.ts";
import type { PriceCurrency } from "./currency.ts";
import type { SearchCriteria } from "./search.ts";

export type GeminiDiscoveryStatus =
  | "disabled"
  | "collected"
  | "empty"
  | "error";

export type GeminiDiscoveryResult = {
  assets: Asset[];
  status: GeminiDiscoveryStatus;
  checkedAt: string;
  cached: boolean;
  groundedQueryCount: number;
};

type GeminiDiscoveryOptions = {
  apiKey?: string;
  model?: string;
  thinkingLevel?: "minimal" | "low" | "medium" | "high";
  fetchImpl?: typeof fetch;
  now?: () => Date;
  timeoutMs?: number;
  cacheTtlMs?: number;
  maxResults?: number;
};

type GeminiPayload = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    groundingMetadata?: {
      webSearchQueries?: string[];
      groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
    };
  }>;
};

// GLI-SPEC: GS-002 GS-004 GS-005 GS-009 GS-012; docs/implementation/CURRENT-STATE.md.
// Cambodia-only scout with process-local results. Model availability, durable
// evidence, missing post dates and all-call cost limits need separate verification.
const DEFAULT_MODEL = "gemini-3.6-flash";
const ALLOWED_SOURCE_HOSTS = new Set([
  "khmer24.com",
  "www.khmer24.com",
  "camrealtyservice.com",
  "www.camrealtyservice.com",
  "cambodiaproperty.asia",
  "www.cambodiaproperty.asia",
]);
const SUPPORTED_CURRENCIES = new Set<PriceCurrency>([
  "USD",
  "KHR",
  "VND",
  "PHP",
  "THB",
  "IDR",
  "MYR",
  "SGD",
  "KRW",
]);
const cache = new Map<
  string,
  { expiresAt: number; result: GeminiDiscoveryResult }
>();
const discoveredAssets = new Map<string, Asset>();

const LISTING_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["listings"],
  properties: {
    listings: {
      type: "array",
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "sourceUrl",
          "sourceName",
          "title",
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
          "summary",
          "imageUrl",
          "publishedAt",
        ],
        properties: {
          sourceUrl: { type: "string" },
          sourceName: { type: "string" },
          title: { type: "string" },
          country: { type: "string" },
          city: { type: "string" },
          district: { type: "string" },
          transaction: { type: "string", enum: ["sale", "rent"] },
          propertyType: {
            type: "string",
            enum: ["condo", "house", "villa"],
          },
          price: { type: "number", minimum: 0 },
          currency: {
            type: "string",
            enum: ["USD", "KHR", "VND", "PHP", "THB", "IDR", "MYR", "SGD", "KRW"],
          },
          areaSqm: { type: "number", minimum: 0 },
          bedrooms: { type: "integer", minimum: 0 },
          bathrooms: { type: "integer", minimum: 0 },
          summary: { type: "string" },
          imageUrl: { type: "string" },
          publishedAt: { type: "string" },
        },
      },
    },
  },
} as const;

/**
 * Uses Gemini only as a server-side web scout. Every returned listing is
 * revalidated against deterministic location, transaction, budget and source
 * boundaries before it can enter the public search result set.
 */
export async function discoverWithGemini(
  query: string,
  criteria: SearchCriteria,
  options: GeminiDiscoveryOptions = {},
): Promise<GeminiDiscoveryResult> {
  const now = options.now?.() ?? new Date();
  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey || criteria.country !== "Cambodia") {
    return emptyResult("disabled", now);
  }

  const model = options.model ?? process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
  const maxResults = Math.min(Math.max(options.maxResults ?? 10, 1), 12);
  const cacheKey = createHash("sha256")
    .update(JSON.stringify({ query, criteria, model, maxResults }))
    .digest("hex");
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now.getTime()) {
    return { ...cached.result, cached: true };
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 30_000,
  );

  try {
    const response = await (options.fetchImpl ?? fetch)(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: [
                  "You are the private web-discovery component of GLI.",
                  "Search only for currently published Cambodia property listing pages on Khmer24, CAM Realty, and Cambodia Property Asia.",
                  "Never create a listing, price, address, date, image URL, or source URL.",
                  "Use a direct listing page as sourceUrl, never a search page, home page, social post, or Google result URL.",
                  "Return only facts visible in search evidence. Use an empty string or 0 when a nonessential field is unavailable.",
                  "Map apartments to condo. Do not return land, hotels, businesses, or general market articles.",
                  "The server-provided country and city are hard boundaries.",
                ].join(" "),
              },
            ],
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: JSON.stringify({
                    task: "Find direct listing pages matching the user's request and structure the visible listing facts.",
                    userQuery: query,
                    authoritativeCriteria: criteria,
                    allowedDomains: [...ALLOWED_SOURCE_HOSTS],
                    maxResults,
                  }),
                },
              ],
            },
          ],
          tools: [{ google_search: {} }],
          generationConfig: {
            thinkingConfig: {
              thinkingLevel:
                options.thinkingLevel ??
                process.env.GEMINI_THINKING_LEVEL ??
                "medium",
            },
            maxOutputTokens: 5_000,
            temperature: 0.1,
            responseFormat: {
              text: {
                mimeType: "APPLICATION_JSON",
                schema: LISTING_SCHEMA,
              },
            },
          },
        }),
        signal: controller.signal,
      },
    );

    if (!response.ok) return emptyResult("error", now);
    const payload = (await response.json()) as GeminiPayload;
    const parsed = parseListings(extractText(payload));
    const assets = parsed
      .map((listing) => validateListing(listing, criteria, now))
      .filter((asset): asset is Asset => asset !== null)
      .slice(0, maxResults);
    for (const asset of assets) discoveredAssets.set(asset.id, asset);
    const result: GeminiDiscoveryResult = {
      assets,
      status: assets.length > 0 ? "collected" : "empty",
      checkedAt: now.toISOString(),
      cached: false,
      groundedQueryCount: extractGroundedQueries(payload).length,
    };
    cache.set(cacheKey, {
      expiresAt: now.getTime() + (options.cacheTtlMs ?? 10 * 60_000),
      result,
    });
    return result;
  } catch {
    return emptyResult("error", now);
  } finally {
    clearTimeout(timeout);
  }
}

export function findGeminiDiscoveredAsset(id: string): Asset | undefined {
  return discoveredAssets.get(id);
}

function validateListing(
  value: unknown,
  criteria: SearchCriteria,
  now: Date,
): Asset | null {
  if (!isRecord(value)) return null;
  const sourceUrl = safeSourceUrl(value.sourceUrl);
  if (!sourceUrl) return null;
  if (
    typeof value.title !== "string" ||
    value.title.trim().length < 3 ||
    value.country !== "Cambodia" ||
    typeof value.city !== "string" ||
    !sameLocation(value.city, criteria.city ?? value.city) ||
    (value.transaction !== "sale" && value.transaction !== "rent") ||
    (criteria.transaction !== null && value.transaction !== criteria.transaction) ||
    (value.propertyType !== "condo" &&
      value.propertyType !== "house" &&
      value.propertyType !== "villa") ||
    (criteria.propertyType !== null && value.propertyType !== criteria.propertyType) ||
    typeof value.price !== "number" ||
    !Number.isFinite(value.price) ||
    value.price <= 0 ||
    (criteria.maxPriceUsd !== null &&
      value.currency === "USD" &&
      value.price > criteria.maxPriceUsd) ||
    typeof value.currency !== "string" ||
    !SUPPORTED_CURRENCIES.has(value.currency as PriceCurrency) ||
    !validNonnegativeNumber(value.areaSqm) ||
    !validCount(value.bedrooms) ||
    !validCount(value.bathrooms) ||
    (criteria.bedrooms !== null && value.bedrooms !== criteria.bedrooms)
  ) {
    return null;
  }

  const title = cleanText(value.title, 200);
  const district =
    typeof value.district === "string" && value.district.trim()
      ? cleanText(value.district, 120)
      : "조사 예정";
  const summary =
    typeof value.summary === "string" && value.summary.trim().length >= 10
      ? cleanText(value.summary, 700)
      : "외부 공개 매물의 기본 정보를 확인했습니다. 세부 조건은 원문과 GLI 추가 조사를 통해 확인할 예정입니다.";
  const sourceName = sourceLabel(sourceUrl.hostname, value.sourceName);
  const updatedAt = parsePublishedAt(value.publishedAt, now);
  const id = createHash("sha256")
    .update(`gemini-web:${sourceUrl.toString()}`)
    .digest("hex")
    .slice(0, 12)
    .toUpperCase();

  return {
    id: `GLI-KH-WEB-${id}`,
    country: "Cambodia",
    countryCode: "KH",
    city: cleanText(value.city, 100),
    district,
    transaction: value.transaction,
    propertyType: value.propertyType,
    assetCategory: "residential",
    categoryLabel: "주거용",
    bedrooms: value.bedrooms,
    bathrooms: value.bathrooms,
    title,
    price: value.price,
    currency: value.currency as PriceCurrency,
    areaSqm: value.areaSqm,
    image: safeImageUrl(value.imageUrl) ?? "/brand/gli-logo.png",
    summary,
    trustScore: 50,
    trustStatus: "PRELIMINARY",
    isGliDirect: false,
    sourceName,
    sourceUrl: sourceUrl.toString(),
    updatedAt,
    strengths: ["외부 공개 원문 연결", "가격과 위치 정보 확인"],
    checks: ["현재 거래 가능 여부", "계약 조건", "권리 관계"],
  };
}

function parseListings(text: string | null): unknown[] {
  if (!text) return [];
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!isRecord(parsed) || !Array.isArray(parsed.listings)) return [];
    return parsed.listings;
  } catch {
    return [];
  }
}

function extractText(payload: GeminiPayload): string | null {
  for (const candidate of payload.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      if (typeof part.text === "string" && part.text.trim()) return part.text;
    }
  }
  return null;
}

function extractGroundedQueries(payload: GeminiPayload): string[] {
  return (payload.candidates ?? []).flatMap(
    (candidate) => candidate.groundingMetadata?.webSearchQueries ?? [],
  );
}

function safeSourceUrl(value: unknown): URL | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const path = url.pathname.toLocaleLowerCase("en-US");
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.hash ||
      !ALLOWED_SOURCE_HOSTS.has(url.hostname.toLocaleLowerCase("en-US")) ||
      path === "/" ||
      path.includes("/wp-json/") ||
      /\/(?:search|category|c-property)(?:\/|$)/.test(path)
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function safeImageUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function sourceLabel(hostname: string, proposed: unknown): string {
  if (hostname.includes("khmer24")) return "Khmer24";
  if (hostname.includes("camrealtyservice")) return "CAM Realty";
  if (hostname.includes("cambodiaproperty")) return "Cambodia Property Asia";
  return typeof proposed === "string" && proposed.trim()
    ? cleanText(proposed, 80)
    : hostname;
}

function parsePublishedAt(value: unknown, now: Date): string {
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed) && parsed <= now.getTime() + 24 * 60 * 60_000) {
      return new Date(parsed).toISOString();
    }
  }
  return now.toISOString();
}

function sameLocation(left: string, right: string): boolean {
  const normalize = (value: string) =>
    value
      .normalize("NFKC")
      .trim()
      .toLocaleLowerCase("en-US")
      .replace(/(?:city|province|municipality)/g, "")
      .replace(/[^a-z0-9]+/g, "");
  const a = normalize(left);
  const b = normalize(right);
  return a === b || a.includes(b) || b.includes(a);
}

function cleanText(value: string, maximum: number): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").slice(0, maximum);
}

function validNonnegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function validCount(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 100;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function emptyResult(
  status: GeminiDiscoveryStatus,
  now: Date,
): GeminiDiscoveryResult {
  return {
    assets: [],
    status,
    checkedAt: now.toISOString(),
    cached: false,
    groundedQueryCount: 0,
  };
}
