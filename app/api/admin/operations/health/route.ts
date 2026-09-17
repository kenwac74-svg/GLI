import { NextResponse } from "next/server";
import { runOperationsHealthScan } from "../../../../../db/operations-health";
import {
  requireApiAdmin,
  validateMutationRequest,
  workflowErrorResponse,
} from "../../../../../lib/member-data";

export async function POST(request: Request) {
  const rejected = validateMutationRequest(request);
  if (rejected) return rejected;
  const authorization = await requireApiAdmin(request);
  if (authorization.response) return authorization.response;

  try {
    const result = await runOperationsHealthScan(
      authorization.context.database,
      authorization.context.workflowUser.id,
    );
    return NextResponse.json(
      { result },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
