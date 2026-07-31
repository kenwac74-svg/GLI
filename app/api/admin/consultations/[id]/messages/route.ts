import { NextResponse } from "next/server";
import { addOperatorConsultationMessage } from "../../../../../../db/consultation-thread.ts";
import {
  requestId,
  requireApiAdmin,
  validateMutationRequest,
  workflowErrorResponse,
} from "../../../../../../lib/member-data";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const rejected = validateMutationRequest(request);
  if (rejected) return rejected;
  const { id } = await context.params;
  const auth = await requireApiAdmin(
    request,
    `/admin/consultations/${encodeURIComponent(id)}`,
  );
  if (auth.response) return auth.response;

  try {
    const body = (await request.json()) as { message?: unknown };
    const result = await addOperatorConsultationMessage(
      auth.context.database,
      {
        consultationId: id,
        actorUserId: auth.context.workflowUser.id,
        body: String(body.message ?? ""),
      },
      { requestId: requestId(request) },
    );
    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
