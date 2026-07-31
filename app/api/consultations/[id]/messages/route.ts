import { NextResponse } from "next/server";
import { addMemberConsultationMessage } from "../../../../../db/consultation-thread.ts";
import {
  requestId,
  requireApiMember,
  validateMutationRequest,
  workflowErrorResponse,
} from "../../../../../lib/member-data";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const rejected = validateMutationRequest(request);
  if (rejected) return rejected;
  const { id } = await context.params;
  const returnTo = `/my/consultations/${encodeURIComponent(id)}`;
  const auth = await requireApiMember(request, returnTo);
  if (auth.response) return auth.response;

  try {
    const body = (await request.json()) as { message?: unknown };
    const result = await addMemberConsultationMessage(
      auth.context.database,
      {
        consultationId: id,
        memberUserId: auth.context.workflowUser.id,
        body: String(body.message ?? ""),
      },
      { requestId: requestId(request) },
    );
    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
