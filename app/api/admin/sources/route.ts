import { NextResponse } from "next/server";
import {
  configureLicensedSource,
  suspendSourceConnector,
} from "../../../../db/operations";
import {
  requireApiAdmin,
  validateMutationRequest,
  workflowErrorResponse,
} from "../../../../lib/member-data";

export async function PUT(request: Request) {
  const rejected = validateMutationRequest(request);
  if (rejected) return rejected;
  const authorization = await requireApiAdmin(request, "/admin");
  if (authorization.response) return authorization.response;
  if (authorization.context.authUser.authProvider === "demo") {
    return demoReadOnlyResponse();
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const result = await configureLicensedSource(
      authorization.context.database,
      {
        sourceSlug: String(body.sourceSlug ?? ""),
        approvalReference: String(body.approvalReference ?? ""),
        approvalExpiresAt:
          body.approvalExpiresAt === null
            ? null
            : Number(body.approvalExpiresAt),
        feedUrl: String(body.feedUrl ?? ""),
        authorizationSecretName:
          body.authorizationSecretName === null ||
          body.authorizationSecretName === undefined
            ? null
            : String(body.authorizationSecretName),
        maxRecordsPerRun: Number(body.maxRecordsPerRun),
      },
      authorization.context.workflowUser.id,
    );
    return NextResponse.json(
      { result },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return workflowErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  const rejected = validateMutationRequest(request);
  if (rejected) return rejected;
  const authorization = await requireApiAdmin(request, "/admin");
  if (authorization.response) return authorization.response;
  if (authorization.context.authUser.authProvider === "demo") {
    return demoReadOnlyResponse();
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (body.action !== "SUSPEND") {
      throw new RangeError("action must be SUSPEND");
    }
    const result = await suspendSourceConnector(
      authorization.context.database,
      String(body.sourceSlug ?? ""),
      authorization.context.workflowUser.id,
    );
    return NextResponse.json(
      { result },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return workflowErrorResponse(error);
  }
}

function demoReadOnlyResponse() {
  return NextResponse.json(
    {
      error:
        "공개 데모 계정에서는 외부 데이터 소스 설정을 저장할 수 없습니다.",
      code: "DEMO_SOURCE_CONFIG_READ_ONLY",
    },
    { status: 403, headers: { "cache-control": "no-store" } },
  );
}
