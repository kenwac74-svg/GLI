import { NextResponse } from "next/server";
import { createConsultation } from "../../../db/user-workflows.ts";
import {
  requestId,
  requireApiMember,
  validateMutationRequest,
  workflowErrorResponse,
} from "../../../lib/member-data";

export async function POST(request: Request) {
  const rejected = validateMutationRequest(request);
  if (rejected) return rejected;
  const auth = await requireApiMember(request, "/my");
  if (auth.response) return auth.response;

  try {
    const body = (await request.json()) as {
      assetId?: unknown;
      requestText?: unknown;
      preferredAt?: unknown;
    };
    const preferredAt =
      typeof body.preferredAt === "string" && body.preferredAt
        ? Date.parse(body.preferredAt)
        : null;
    const result = await createConsultation(auth.context.database, {
      userId: auth.context.workflowUser.id,
      listingPublicId:
        typeof body.assetId === "string" && body.assetId
          ? body.assetId
          : null,
      requestText: String(body.requestText ?? ""),
      preferredAt:
        preferredAt !== null && Number.isFinite(preferredAt)
          ? preferredAt
          : null,
      requestId: requestId(request),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
