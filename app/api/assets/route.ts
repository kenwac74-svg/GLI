import { NextResponse } from "next/server";
import { listAssets } from "../../../lib/assets-data";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const transaction = url.searchParams.get("transaction");
  const direct = url.searchParams.get("direct");
  if (transaction && transaction !== "sale" && transaction !== "rent") {
    return NextResponse.json(
      { error: { code: "INVALID_TRANSACTION", message: "거래 유형을 확인해 주세요." } },
      { status: 400 },
    );
  }

  const result = await listAssets({
    transaction: transaction ?? undefined,
    limit: 100,
  });
  const assets =
    direct === "true"
      ? result.assets.filter((asset) => asset.isGliDirect)
      : result.assets;

  return NextResponse.json({
    data: assets,
    meta: { count: assets.length, dataMode: result.mode },
  });
}
