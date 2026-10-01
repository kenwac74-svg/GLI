import type { Asset } from "./assets.ts";
import { convertCurrency } from "./currency.ts";
import { getExchangeRates } from "./exchange-rates.ts";
import { assertVietnamRobotsAllowed, isVietnamDemoRequestEnabled, parseDotPropertyListings, readPublicPage } from "./vietnam-discovery.ts";

// GLI-SPEC: GS-005/P47. Only Dot Philippines is approved for bounded demo
// discovery. Reuse the existing gate/parser; not a licence for commercial reuse.
// No pagination, details/contact downloads, auxiliary feeds or paid AI here.
export const isPhilippinesDemoRequestEnabled = isVietnamDemoRequestEnabled;
type Result = {
  demoOnly: true; checkedAt: string; cached: boolean; assets: Asset[];
  sources: { name: string; status: "collected" | "blocked" | "unavailable" | "disabled"; count: number; reason?: string }[];
};
type Options = { enabled?: boolean; refresh?: boolean; fetchImpl?: typeof fetch; now?: () => Date };
let cache: { expiresAt: number; result: Result } | null = null;
let pending: Promise<Result> | null = null;
const liveAssets = new Map<string, Asset>();
export function findLivePhilippinesAsset(id: string): Asset | null { return liveAssets.get(id) ?? null; }

export async function discoverPhilippinesAssets(options: Options = {}): Promise<Result> {
  const now = options.now?.() ?? new Date();
  const held = ["Lamudi Philippines", "Rentpad"].map(name => ({ name, status: "disabled" as const, count: 0, reason: "access_review_HTTP_403" }));
  if (!options.enabled) return { demoOnly: true, checkedAt: now.toISOString(), cached: false, assets: [],
    sources: [{ name: "Dot Property Philippines", status: "disabled", count: 0, reason: "demo_only" }, ...held] };
  const useCache = !options.fetchImpl && !options.now;
  if (useCache && cache && cache.expiresAt > now.getTime() && (!options.refresh || cache.result.assets.length === 0)) return { ...cache.result, cached: true };
  if (useCache && pending) return pending;
  const job = collect(options.fetchImpl ?? fetch, now, held);
  if (!useCache) return job;
  pending = job;
  try {
    const result = await job;
    cache = { result, expiresAt: Date.now() + (result.assets.length ? 600_000 : 60_000) };
    for (const asset of result.assets) liveAssets.set(asset.id, asset);
    while (liveAssets.size > 120) liveAssets.delete(liveAssets.keys().next().value!);
    return result;
  } finally { pending = null; }
}

async function collect(fetchImpl: typeof fetch, now: Date, held: Result["sources"]): Promise<Result> {
  const assets: Asset[] = [];
  let failure: string | undefined;
  try {
    const robots = await readPublicPage(new URL("https://www.dotproperty.com.ph/robots.txt"), fetchImpl, true);
    for (const transaction of ["sale", "rent"] as const) {
      const url = new URL(`https://www.dotproperty.com.ph/condos-for-${transaction}`);
      assertVietnamRobotsAllowed(robots, url.pathname);
      const html = await readPublicPage(url, fetchImpl);
      assets.push(...parseDotPropertyListings(html, transaction, now, "Philippines"));
    }
    if (!assets.length) throw new Error("no_supported_listing_data");
  } catch (error) { failure = error instanceof Error ? error.message : "collection_failed"; }
  if (assets.length) {
    const rates = await getExchangeRates(fetchImpl);
    if (rates && !rates.stale) for (const asset of assets) {
      const amount = convertCurrency(asset.price, asset.currency, "USD", rates.snapshot.rates);
      if (amount !== null) asset.priceUsdReference = { amount, provider: rates.snapshot.provider, asOf: rates.snapshot.updatedAt };
    }
  }
  return { demoOnly: true, checkedAt: now.toISOString(), cached: false, assets, sources: [
    { name: "Dot Property Philippines", count: assets.length,
      status: assets.length ? "collected" : /HTTP_403|HTTP_429|robots policy/.test(failure ?? "") ? "blocked" : "unavailable",
      ...(failure ? { reason: assets.length ? `partial_collection:${failure}` : failure } : {}) }, ...held,
  ] };
}
