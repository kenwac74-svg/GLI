import { NextResponse } from "next/server";
import {
  updateConsultation,
  type ConsultationStatus,
} from "../../../../db/consultation-operations.ts";
import {
  requestId,
  requireApiAdmin,
  validateMutationRequest,
  workflowErrorResponse,
} from "../../../../lib/member-data";

export async function PATCH(request: Request) {
  const rejected = validateMutationRequest(request);
  if (rejected) return rejected;
  const auth = await requireApiAdmin(request);
  if (auth.response) return auth.response;

  try {
    const body = (await request.json()) as {
      consultationId?: unknown;
      status?: unknown;
      assigneeUserId?: unknown;
    };
    const status = String(body.status ?? "")
      .trim()
      .toUpperCase() as ConsultationStatus;
    const assigneeUserId =
      body.assigneeUserId === null
        ? null
        : typeof body.assigneeUserId === "string"
          ? body.assigneeUserId
          : status === "CONTACTED"
            ? auth.context.workflowUser.id
            : undefined;
    const result = await updateConsultation(auth.context.database, {
      consultationId: String(body.consultationId ?? ""),
      status,
      assigneeUserId,
      actorUserId: auth.context.workflowUser.id,
      requestId: requestId(request),
    });
    return NextResponse.json({ result });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
