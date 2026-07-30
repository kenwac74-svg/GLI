import { NextResponse } from "next/server";
import {
  APPROVED_FIXTURE_REQUESTED_FIELDS,
  createApprovedDemoFeed,
} from "../../../../../ingestion/demo-feed";
import { SourcePolicyError } from "../../../../../ingestion/source-policy";
import { runApprovedFixtureIngestion } from "../../../../../db/operations";
import {
  requireApiAdmin,
  validateMutationRequest,
  workflowErrorResponse,
} from "../../../../../lib/member-data";

export async function POST(request: Request) {
  const invalid = validateMutationRequest(request);
  if (invalid) return invalid;

  const authorization = await requireApiAdmin(request);
  if (authorization.response) return authorization.response;

  try {
    const result = await runApprovedFixtureIngestion(
      authorization.context.database,
      "approved-fixture",
      APPROVED_FIXTURE_REQUESTED_FIELDS,
      createApprovedDemoFeed(),
      authorization.context.workflowUser.id,
    );
    return NextResponse.json(
      { result },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof SourcePolicyError) {
      return NextResponse.json(
        {
          error: "데이터 소스 승인이 유효하지 않아 수집을 중단했습니다.",
          code: error.reason,
        },
        { status: 409, headers: { "cache-control": "no-store" } },
      );
    }
    return workflowErrorResponse(error);
  }
}
