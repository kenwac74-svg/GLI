import { NextResponse } from "next/server";
import { activateDemoCashMembership } from "../../../../db/user-workflows.ts";
import {
  requestId,
  requireApiMember,
  validateMutationRequest,
  workflowErrorResponse,
} from "../../../../lib/member-data";

export async function POST(request: Request) {
  const rejected = validateMutationRequest(request);
  if (rejected) return rejected;
  const auth = await requireApiMember(request, "/membership");
  if (auth.response) return auth.response;

  try {
    const body = (await request.json()) as { planId?: unknown };
    const result = await activateDemoCashMembership(
      auth.context.database,
      {
        userId: auth.context.workflowUser.id,
        planId: String(body.planId ?? ""),
        requestId: requestId(request),
      },
    );
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
