import { NextResponse } from "next/server";
import { assets } from "../../../lib/assets";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const transaction = url.searchParams.get("transaction");
  const direct = url.searchParams.get("direct");
  const results = assets.filter(
    (asset) =>
      (!transaction || asset.transaction === transaction) &&
      (direct !== "true" || asset.isGliDirect),
  );
  return NextResponse.json({
    data: results,
    meta: { count: results.length, dataMode: "approved-fixture" },
  });
}
