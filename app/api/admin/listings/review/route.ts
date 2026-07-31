import { NextResponse } from "next/server";
import {
  reviewListing,
  type ReviewAction,
  type ListingReviewEvidence,
} from "../../../../../db/operations";
import {
  requireApiAdmin,
  validateMutationRequest,
  workflowErrorResponse,
} from "../../../../../lib/member-data";

export async function POST(request: Request) {
  const invalid = validateMutationRequest(request);
  if (invalid) return invalid;

  const authorization = await requireApiAdmin(request);
  if (authorization.response) return authorization.response;

  try {
    const body = (await request.json()) as {
      publicId?: unknown;
      action?: unknown;
      evidence?: unknown;
    };
    if (typeof body.publicId !== "string") {
      throw new TypeError("publicId is required");
    }
    if (body.action !== "PUBLISH" && body.action !== "HOLD") {
      throw new RangeError("action must be PUBLISH or HOLD");
    }

    const result = await reviewListing(
      authorization.context.database,
      body.publicId,
      body.action as ReviewAction,
      authorization.context.workflowUser.id,
      body.evidence as ListingReviewEvidence,
    );
    return NextResponse.json(
      { result },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return workflowErrorResponse(error);
  }
}

