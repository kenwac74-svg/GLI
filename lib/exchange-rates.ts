import { PRICE_CURRENCIES, type ExchangeRateSnapshot, type PriceCurrency } from "./currency.ts";

// Shared by display and server-side budget matching; no model-generated rates.
const PROVIDER_URL = "https://open.er-api.com/v6/latest/USD";
let cache: { expiresAt: number; snapshot: ExchangeRateSnapshot } | undefined;
let pending: Promise<{ snapshot: ExchangeRateSnapshot; stale: boolean } | null> | null = null;

export async function getExchangeRates(fetchImpl: typeof fetch = fetch) {
  const runtime = fetchImpl === fetch;
  if (runtime && cache && cache.expiresAt > Date.now()) return { snapshot: cache.snapshot, stale: false };
  if (runtime && pending) return pending;
  const job = load(fetchImpl, runtime);
  if (!runtime) return job;
  pending = job;
  try { return await job; } finally { pending = null; }
}

async function load(fetchImpl: typeof fetch, runtime: boolean) {
  try {
    const response = await fetchImpl(PROVIDER_URL, {
      headers: { accept: "application/json" }, redirect: "manual", signal: AbortSignal.timeout(4_000),
    });
    if (!response.ok) throw new Error(`rate_provider_HTTP_${response.status}`);
    const payload = await response.json() as Record<string, unknown>;
    if (payload.result !== "success" || !payload.rates || typeof payload.rates !== "object") throw new Error("invalid_rates");
    const raw = payload.rates as Record<string, unknown>;
    const rates: Partial<Record<PriceCurrency, number>> = {};
    for (const currency of PRICE_CURRENCIES) {
      const rate = raw[currency];
      if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) rates[currency] = rate;
    }
    const updatedAt = timestamp(payload.time_last_update_unix);
    if (rates.USD !== 1 || !rates.KRW || !updatedAt) throw new Error("incomplete_rates");
    const snapshot: ExchangeRateSnapshot = {
      baseCurrency: "USD", rates, updatedAt, nextUpdateAt: timestamp(payload.time_next_update_unix), provider: "ExchangeRate-API",
    };
    if (runtime) cache = { expiresAt: Date.now() + 23 * 60 * 60 * 1_000, snapshot };
    return { snapshot, stale: false };
  } catch (error) {
    console.warn("[exchange-rates]", error instanceof Error ? error.message : "rate_provider_unavailable");
    return runtime && cache ? { snapshot: cache.snapshot, stale: true } : null;
  }
}

function timestamp(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  const date = new Date(value * 1_000);
  return Number.isFinite(date.valueOf()) ? date.toISOString() : null;
}
