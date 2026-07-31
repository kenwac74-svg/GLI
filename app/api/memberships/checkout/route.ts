import { NextResponse } from "next/server";
import { createCashCheckout } from "../../../../db/membership-billing.ts";
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
    const checkout = await createCashCheckout(
      auth.context.database,
      {
        userId: auth.context.workflowUser.id,
        planId: String(body.planId ?? ""),
        requestId: requestId(request),
      },
    );
    return NextResponse.json(
      {
        checkout,
        checkoutUrl: `/membership/checkout?id=${encodeURIComponent(checkout.id)}`,
      },
      { status: 201 },
    );
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
