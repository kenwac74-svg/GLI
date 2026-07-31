import { NextResponse } from "next/server";
import { completeDemoCashCheckout } from "../../../../../db/membership-billing.ts";
import { isDemoBillingEnabled } from "../../../../../lib/demo-billing";
import {
  requestId,
  requireApiMember,
  validateMutationRequest,
  workflowErrorResponse,
} from "../../../../../lib/member-data";

export async function POST(request: Request) {
  const rejected = validateMutationRequest(request);
  if (rejected) return rejected;
  if (!(await isDemoBillingEnabled())) {
    return demoBillingDisabledResponse();
  }
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

function demoBillingDisabledResponse() {
  return NextResponse.json(
    {
      error: "데모 결제는 데모 환경에서만 사용할 수 있습니다.",
      code: "DEMO_BILLING_DISABLED",
    },
    { status: 503, headers: { "cache-control": "no-store" } },
  );
}
