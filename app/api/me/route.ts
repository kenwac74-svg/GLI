import { NextResponse } from "next/server";
import { getUserDashboard } from "../../../db/user-workflows.ts";
import { requireApiMember, workflowErrorResponse } from "../../../lib/member-data";

export async function GET(request: Request) {
  const auth = await requireApiMember(request, "/my");
  if (auth.response) return auth.response;

  try {
    const dashboard = await getUserDashboard(
      auth.context.database,
      auth.context.workflowUser.id,
    );
    return NextResponse.json(dashboard, {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
