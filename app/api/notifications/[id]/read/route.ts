import { NextResponse } from "next/server";
import { markMemberNotificationRead } from "../../../../../db/member-notifications.ts";
import {
  requestId,
  requireApiMember,
  validateMutationRequest,
  workflowErrorResponse,
} from "../../../../../lib/member-data";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const rejected = validateMutationRequest(request);
  if (rejected) return rejected;
  const { id } = await context.params;
  const auth = await requireApiMember(request, "/my");
  if (auth.response) return auth.response;

  try {
    const result = await markMemberNotificationRead(
      auth.context.database,
      {
        notificationId: id,
        userId: auth.context.workflowUser.id,
      },
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
