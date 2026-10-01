import type { Asset } from "./assets.ts";
import { searchCountries, type SearchCriteria, type SearchCountry, type SearchResult } from "./search.ts";

type CountryBatch = {
  assets: Asset[];
  sources: Array<{ name: string; status: string; count: number; slug?: string; reason?: string }>;
  cached: boolean;
  checkedAt: string;
};

// A failed country must not discard successful countries or masquerade as no inventory.
export async function collectSearchCountries(criteria: SearchCriteria,
  collect: (country: SearchCountry) => Promise<CountryBatch | null>) {
  const countries = searchCountries(criteria);
  const batches = await Promise.allSettled(countries.map(collect));
  const coverage: NonNullable<SearchResult["coverage"]> = [];
  const assets: Asset[] = [];
  const sources: CountryBatch["sources"] = [];
  let cached = true;
  for (let index = 0; index < batches.length; index++) {
    const outcome = batches[index];
    const batch = outcome.status === "fulfilled" ? outcome.value : null;
    const active = batch?.sources.filter(source => source.status !== "disabled") ?? [];
    const available = active.filter(source => ["collected", "snapshot"].includes(source.status));
    coverage.push({ country: countries[index], status: !available.length ? "unavailable"
      : available.length < active.length ? "partial" : "collected", collectedCount: batch?.assets.length ?? 0 });
    if (!batch) { cached = false; continue; }
    cached &&= batch.cached;
    assets.push(...batch.assets.map(asset => ({ ...asset,
      sourceObservedAt: asset.sourceObservedAt ?? batch.checkedAt })));
    sources.push(...batch.sources);
  }
  return { assets, sources, cached, checkedAt: new Date().toISOString(), coverage };
}
