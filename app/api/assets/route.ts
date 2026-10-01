import { NextResponse } from "next/server";
import { listAssets } from "../../../lib/assets-data";
import { assetLocale, localizeAssets } from "../../../lib/asset-localization";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = assetLocale(url.searchParams.get("locale") ?? undefined);
  if (!locale) {
    return NextResponse.json({ error: { code: "INVALID_LOCALE", message: "지원하는 언어를 확인해 주세요." } }, { status: 400 });
  }
  const transaction = url.searchParams.get("transaction");
  const direct = url.searchParams.get("direct");
  if (transaction && transaction !== "sale" && transaction !== "rent") {
    return NextResponse.json(
      { error: { code: "INVALID_TRANSACTION", message: "거래 유형을 확인해 주세요." } },
      { status: 400 },
    );
  }

  const result = await listAssets({
    transaction: transaction === "sale" || transaction === "rent" ? transaction : undefined,
    limit: 100,
  });
  const assets =
    direct === "true"
      ? result.assets.filter((asset) => asset.isGliDirect)
      : result.assets;

  return NextResponse.json({
    data: await localizeAssets(assets, locale),
    meta: { count: assets.length, dataMode: result.mode },
  });
}
