import { NextResponse } from "next/server";
import { updateOperationalAlert } from "../../../../../db/operations-health";
import {
  requireApiAdmin,
  validateMutationRequest,
  workflowErrorResponse,
} from "../../../../../lib/member-data";

export async function PATCH(request: Request) {
  const rejected = validateMutationRequest(request);
  if (rejected) return rejected;
  const authorization = await requireApiAdmin(request);
  if (authorization.response) return authorization.response;

  try {
    const body = (await request.json()) as {
      alertId?: unknown;
      status?: unknown;
    };
    const result = await updateOperationalAlert(
      authorization.context.database,
      {
        alertId: Number(body.alertId),
        status: String(body.status ?? "").toUpperCase() as
          | "ACKNOWLEDGED"
          | "RESOLVED",
        actorUserId: authorization.context.workflowUser.id,
      },
    );
    return NextResponse.json(
      { result },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
