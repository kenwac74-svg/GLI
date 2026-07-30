import { NextResponse } from "next/server";
import {
  addFavorite,
  removeFavorite,
} from "../../../db/user-workflows.ts";
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
    const body = (await request.json()) as { assetId?: unknown };
    const result = await addFavorite(
      auth.context.database,
      {
        userId: auth.context.workflowUser.id,
        listingPublicId: String(body.assetId ?? ""),
        requestId: requestId(request),
      },
    );
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  const rejected = validateMutationRequest(request);
  if (rejected) return rejected;
  const auth = await requireApiMember(request, "/my");
  if (auth.response) return auth.response;

  try {
    const body = (await request.json()) as { assetId?: unknown };
    const result = await removeFavorite(auth.context.database, {
      userId: auth.context.workflowUser.id,
      listingPublicId: String(body.assetId ?? ""),
      requestId: requestId(request),
    });
    return NextResponse.json(result);
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
