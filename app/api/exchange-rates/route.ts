import { NextResponse } from "next/server";
import { getExchangeRates } from "../../../lib/exchange-rates.ts";

export async function GET() {
  const result = await getExchangeRates();
  if (!result) return NextResponse.json(
      { error: { code: "EXCHANGE_RATE_UNAVAILABLE" } },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  return NextResponse.json(
    { ...result.snapshot, stale: result.stale },
    {
      headers: {
        "cache-control": "public, max-age=3600, s-maxage=82800, stale-if-error=86400",
      },
    },
  );
}
