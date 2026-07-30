import { NextResponse } from "next/server";
import { assets } from "../../../lib/assets";
import { searchAssets } from "../../../lib/search";

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
  const query = typeof body === "object" && body !== null && "query" in body && typeof body.query === "string"
    ? body.query.trim()
    : "";
  if (!query || query.length > 800) {
    return NextResponse.json(
      { error: { code: "INVALID_QUERY", message: "1자 이상 800자 이하로 입력해 주세요." } },
      { status: 400 },
    );
  }
  return NextResponse.json(searchAssets(query, assets));
}
