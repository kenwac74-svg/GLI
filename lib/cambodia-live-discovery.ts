import { createHash } from "node:crypto";
import type { Asset } from "./assets.ts";
import type { NormalizationInput } from "../ingestion/normalize.ts";
import type { RawObjectStore } from "../ingestion/contracts.ts";
import { createKhmer24ReferenceConnector } from "../ingestion/khmer24-reference-feed.ts";
import { createWordPressPropertyConnector } from "../ingestion/wordpress-property-feed.ts";
import { getCambodiaSourceSnapshot } from "./cambodia-source-snapshots.ts";

export type CambodiaDiscoverySource = {
  slug: string;
  name: string;
  status: "collected" | "snapshot" | "unavailable";
  count: number;
};

export type CambodiaDiscoveryResult = {
  assets: Asset[];
  sources: CambodiaDiscoverySource[];
  cached: boolean;
  checkedAt: string;
};

type DiscoveryOptions = {
  fetchImpl?: typeof fetch;
  now?: () => Date;
  timeoutMs?: number;
  maxRecordsPerSource?: number;
  cacheTtlMs?: number;
  city?: string | null;
};

const CACHE_KEY = "cambodia-public-property-sources-v1";
const cache = new Map<string, { expiresAt: number; result: CambodiaDiscoveryResult }>();
const liveAssets = new Map<string, Asset>();
const rawStore: RawObjectStore = { async put() { return undefined; } };

const PROFESSIONAL_SOURCES = [
  {
    slug: "cam-realty-cambodia",
    name: "CAM Realty",
    apiUrl:
      "https://camrealtyservice.com/wp-json/wp/v2/property?per_page=30&orderby=modified&order=desc&_embed=wp:featuredmedia",
    allowedHosts: ["camrealtyservice.com"],
  },
  {
    slug: "cambodia-property-asia",
    name: "Cambodia Property Asia",
    apiUrl:
      "https://www.cambodiaproperty.asia/wp-json/wp/v2/property?per_page=30&orderby=modified&order=desc&_embed=wp:featuredmedia",
    allowedHosts: ["www.cambodiaproperty.asia"],
    requiredLinkPathPrefix: "/en/",
  },
] as const;

export async function discoverCambodiaAssets(
  options: DiscoveryOptions = {},
): Promise<CambodiaDiscoveryResult> {
  const now = options.now?.() ?? new Date();
  const searchTerm = options.city?.trim() || null;
  const cacheKey = `${CACHE_KEY}:${searchTerm?.toLocaleLowerCase("en-US") ?? "all"}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now.getTime()) {
    return { ...cached.result, cached: true };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 3_500;
  const maxRecords = options.maxRecordsPerSource ?? 20;
  const professional = await Promise.all(
    PROFESSIONAL_SOURCES.map(async (source) => {
      const connector = createWordPressPropertyConnector({
        sourceSlug: source.slug,
        apiUrl: withSearchTerm(source.apiUrl, searchTerm),
        allowedHosts: source.allowedHosts,
        maxRecords,
        rawStore,
        fetchImpl,
        now: () => now,
        timeoutMs,
        ...(source.requiredLinkPathPrefix
          ? { requiredLinkPathPrefix: source.requiredLinkPathPrefix }
          : {}),
      });
      return collectSource(source.slug, source.name, connector.collect);
    }),
  );

  // The broad classified source is deliberately attempted after the two
  // structured professional sources. It is never accessed when robots policy
  // or the source itself refuses this reference-search collector.
  const khmer24Connector = createKhmer24ReferenceConnector({
    sourceSlug: "khmer24-cambodia",
    categoryUrl: withSearchTerm(
      "https://www.khmer24.com/en/c-property-housing-rentals",
      searchTerm,
    ),
    allowedHosts: ["www.khmer24.com"],
    maxRecords,
    rawStore,
    fetchImpl,
    now: () => now,
    timeoutMs,
  });
  const khmer24 = await collectSource(
    "khmer24-cambodia",
    "Khmer24",
    khmer24Connector.collect,
  );

  const collected = [...professional, khmer24];
  const assets = collected.flatMap((source) =>
    source.candidates.map((candidate) => toAsset(candidate, source.slug, source.name)),
  );
  for (const asset of assets) liveAssets.set(asset.id, asset);

  const result: CambodiaDiscoveryResult = {
    assets,
    sources: collected.map(({ slug, name, candidates, status }) => ({
      slug,
      name,
      status,
      count: candidates.length,
    })),
    cached: false,
    checkedAt: now.toISOString(),
  };
  cache.set(cacheKey, {
    expiresAt:
      now.getTime() +
      (options.cacheTtlMs ?? (assets.length > 0 ? 10 * 60_000 : 30_000)),
    result,
  });
  return result;
}

function withSearchTerm(url: string, searchTerm: string | null): string {
  if (!searchTerm) return url;
  const parsed = new URL(url);
  if (parsed.pathname.includes("/wp-json/")) parsed.searchParams.set("search", searchTerm);
  else parsed.searchParams.set("q", searchTerm);
  return parsed.toString();
}

export function findLiveCambodiaAsset(id: string): Asset | undefined {
  return liveAssets.get(id);
}

async function collectSource(
  slug: string,
  name: string,
  collect: () => Promise<{ candidates: readonly NormalizationInput[] }>,
): Promise<{
  slug: string;
  name: string;
  status: "collected" | "snapshot" | "unavailable";
  candidates: readonly NormalizationInput[];
}> {
  try {
    const batch = await collect();
    if (batch.candidates.length > 0) {
      return { slug, name, status: "collected", candidates: batch.candidates };
    }
  } catch {
    // Fall through to the last successful snapshot. This keeps source-backed
    // results available during a temporary upstream outage.
  }
  const snapshot = getCambodiaSourceSnapshot(slug);
  return snapshot
    ? { slug, name, status: "snapshot", candidates: snapshot.candidates }
    : { slug, name, status: "unavailable", candidates: [] };
}

function toAsset(
  candidate: NormalizationInput,
  sourceSlug: string,
  sourceName: string,
): Asset {
  const suffix = createHash("sha256")
    .update(`${sourceSlug}:${candidate.sourceExternalKey}`)
    .digest("hex")
    .slice(0, 12)
    .toUpperCase();
  return {
    id: `GLI-KH-LIVE-${suffix}`,
    country: "Cambodia",
    countryCode: "KH",
    city: candidate.city,
    district: candidate.district,
    transaction: candidate.transaction,
    propertyType: candidate.propertyType,
    assetCategory: "residential",
    categoryLabel: "주거용",
    bedrooms: candidate.bedrooms,
    bathrooms: candidate.bathrooms,
    title: candidate.title,
    price: candidate.price,
    currency: candidate.currency,
    areaSqm: candidate.areaSqm,
    image: candidate.imageUrl ?? "/brand/gli-logo.png",
    summary: candidate.summary,
    trustScore: 55,
    trustStatus: "PRELIMINARY",
    isGliDirect: false,
    sourceName,
    sourceUrl: candidate.sourceUrl,
    updatedAt: candidate.observedAt,
    strengths: ["공개 원문 연결", "가격·면적·유형 확인"],
    checks: ["현재 거래 가능 여부", "계약 조건", "권리 관계"],
  };
}
