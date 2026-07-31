import { NextResponse } from "next/server";
import { getTrustReportForMember } from "../../../../../db/trust-report-access";
import {
  requireApiMember,
  workflowErrorResponse,
} from "../../../../../lib/member-data";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const authorization = await requireApiMember(
    request,
    `/assets/${encodeURIComponent(id)}/trust-report`,
  );
  if (authorization.response) return authorization.response;

  try {
    const access = await getTrustReportForMember(
      authorization.context.database,
      authorization.context.workflowUser.id,
      id,
    );
    if (!access.granted) {
      return NextResponse.json(
        {
          error:
            access.reason === "MEMBERSHIP_REQUIRED"
              ? "전체 Trust Report는 Investor 이상 멤버십에서 제공됩니다."
              : "현재 플랜에서는 전체 Trust Report를 열 수 없습니다.",
          code: access.reason,
          membershipPlanId: access.membershipPlanId,
          upgradeUrl: "/membership",
        },
        { status: 403, headers: { "cache-control": "private, no-store" } },
      );
    }
    return NextResponse.json(access, {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
