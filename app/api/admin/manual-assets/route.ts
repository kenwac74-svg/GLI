import { NextResponse } from "next/server";
import { saveManualAsset } from "../../../../db/manual-assets.ts";
import { requireApiAdmin, validateMutationRequest, workflowErrorResponse } from "../../../../lib/member-data.ts";

export async function POST(request: Request) {
  const rejected = validateMutationRequest(request);
  if (rejected) return rejected;
  const auth = await requireApiAdmin(request);
  if (auth.response) return auth.response;
  if (auth.context.authUser.authProvider === "demo") {
    return NextResponse.json({ error: "데모 계정은 자료를 저장할 수 없습니다.", code: "DEMO_IMPORT_DISABLED" }, { status: 403 });
  }
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).length > 16000) throw new RangeError("입력 자료가 너무 큽니다.");
    const body = JSON.parse(text);
    const draft = await saveManualAsset(auth.context.database, auth.context.workflowUser.id, body.requestKey, body.asset);
    return NextResponse.json({ draft }, { status: 201, headers: { "cache-control": "no-store" } });
  } catch (error) {
    return workflowErrorResponse(error instanceof SyntaxError ? new TypeError("입력 형식을 확인해 주세요.") : error);
  }
}
