import { NextResponse } from "next/server";
import {
  PRICE_CURRENCIES,
  type ExchangeRateSnapshot,
  type PriceCurrency,
} from "../../../lib/currency";

const PROVIDER_URL = "https://open.er-api.com/v6/latest/USD";
const CACHE_TTL_MS = 23 * 60 * 60 * 1_000;

let cachedRates:
  | { expiresAt: number; snapshot: ExchangeRateSnapshot }
  | undefined;

type ProviderResponse = {
  result?: unknown;
  time_last_update_unix?: unknown;
  time_next_update_unix?: unknown;
  rates?: unknown;
};

export async function GET() {
  const now = Date.now();
  if (cachedRates && cachedRates.expiresAt > now) {
    return rateResponse(cachedRates.snapshot);
  }

  try {
    const response = await fetch(PROVIDER_URL, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(4_000),
    });
    if (!response.ok) throw new Error(`rate_provider_${response.status}`);

    const payload = (await response.json()) as ProviderResponse;
    if (payload.result !== "success" || !isRecord(payload.rates)) {
      throw new Error("invalid_rate_payload");
    }

    const rates: Partial<Record<PriceCurrency, number>> = {};
    for (const currency of PRICE_CURRENCIES) {
      const rate = payload.rates[currency];
      if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
        rates[currency] = rate;
      }
    }
    if (rates.USD !== 1 || !rates.KRW) throw new Error("incomplete_rate_payload");

    const updatedAt = unixTimestamp(payload.time_last_update_unix) ?? new Date(now);
    const nextUpdateAt = unixTimestamp(payload.time_next_update_unix);
    const snapshot: ExchangeRateSnapshot = {
      baseCurrency: "USD",
      rates,
      updatedAt: updatedAt.toISOString(),
      nextUpdateAt: nextUpdateAt?.toISOString() ?? null,
      provider: "ExchangeRate-API",
    };
    cachedRates = { expiresAt: now + CACHE_TTL_MS, snapshot };
    return rateResponse(snapshot);
  } catch {
    if (cachedRates) return rateResponse(cachedRates.snapshot, true);
    return NextResponse.json(
      { error: { code: "EXCHANGE_RATE_UNAVAILABLE" } },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}

function rateResponse(snapshot: ExchangeRateSnapshot, stale = false) {
  return NextResponse.json(
    { ...snapshot, stale },
    {
      headers: {
        "cache-control": "public, max-age=3600, s-maxage=82800, stale-if-error=86400",
      },
    },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function unixTimestamp(value: unknown): Date | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  const date = new Date(value * 1_000);
  return Number.isFinite(date.valueOf()) ? date : null;
}
