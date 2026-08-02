import { NextResponse } from "next/server";
import { recordBackupVerification } from "../../../../../db/release-readiness";
import {
  requestId,
  requireApiAdmin,
  validateMutationRequest,
  workflowErrorResponse,
} from "../../../../../lib/member-data";

export async function POST(request: Request) {
  const rejected = validateMutationRequest(request);
  if (rejected) return rejected;
  const authorization = await requireApiAdmin(request, "/admin/readiness");
  if (authorization.response) return authorization.response;
  if (authorization.context.authUser.authProvider === "demo") {
    return NextResponse.json(
      {
        error: "공개 데모에서는 백업 증적을 저장할 수 없습니다.",
        code: "DEMO_BACKUP_EVIDENCE_READ_ONLY",
      },
      { status: 403, headers: { "cache-control": "no-store" } },
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const result = await recordBackupVerification(
      authorization.context.database,
      {
        environment: body.environment,
        storageProvider: body.storageProvider,
        objectKey: body.objectKey,
        manifestSha256: body.manifestSha256,
        capturedAt: body.capturedAt,
        restoreTestedAt: body.restoreTestedAt,
        restoreResult: body.restoreResult,
        notes: body.notes,
      },
      authorization.context.workflowUser.id,
      { requestId: requestId(request) },
    );
    return NextResponse.json(
      { result },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
