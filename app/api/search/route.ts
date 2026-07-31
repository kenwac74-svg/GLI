import { NextResponse } from "next/server";
import { listAssets } from "../../../lib/assets-data";
import {
  createSafetyIdentifier,
  runAdvisorSearch,
} from "../../../lib/ai-search";
import { parseSearchContext } from "../../../lib/search";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "요청 형식을 확인해 주세요." } },
      { status: 400 },
    );
  }

  const query =
    typeof body === "object" &&
    body !== null &&
    "query" in body &&
    typeof body.query === "string"
      ? body.query.trim()
      : "";

  if (!query || query.length > 800) {
    return NextResponse.json(
      { error: { code: "INVALID_QUERY", message: "1자 이상 800자 이하로 입력해 주세요." } },
      { status: 400 },
    );
  }

  const contextValue =
    typeof body === "object" && body !== null && "context" in body
      ? body.context
      : undefined;
  const context =
    contextValue === undefined ? null : parseSearchContext(contextValue);
  if (contextValue !== undefined && context === null) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_SEARCH_CONTEXT",
          message: "이전 검색 조건을 확인해 주세요.",
        },
      },
      { status: 400 },
    );
  }

  const source = await listAssets({ country: "Cambodia", city: "Phnom Penh", limit: 100 });
  const safetyIdentifier = createSafetyIdentifier(
    request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for"),
  );
  return NextResponse.json({
    ...(await runAdvisorSearch(query, source.assets, {
      safetyIdentifier,
      context,
    })),
    dataMode: source.mode,
  });
}
