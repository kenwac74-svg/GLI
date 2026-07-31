import { NextResponse } from "next/server";
import { completeDemoCashCheckout } from "../../../../../db/membership-billing.ts";
import {
  requestId,
  requireApiMember,
  validateMutationRequest,
  workflowErrorResponse,
} from "../../../../../lib/member-data";

export async function POST(request: Request) {
  const rejected = validateMutationRequest(request);
  if (rejected) return rejected;
  const auth = await requireApiMember(request, "/membership");
  if (auth.response) return auth.response;

  try {
    const body = (await request.json()) as { checkoutId?: unknown };
    const result = await completeDemoCashCheckout(
      auth.context.database,
      {
        checkoutId: String(body.checkoutId ?? ""),
        userId: auth.context.workflowUser.id,
        requestId: requestId(request),
      },
    );
    return NextResponse.json(result);
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
