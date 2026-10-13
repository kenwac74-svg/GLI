import { NextResponse } from "next/server";
import { createD1AssetFavoritesRepository, publicFavorite } from "../../../db/asset-favorites-repository.ts";
import { ensureAssetReference } from "../../../lib/asset-reference-service.ts";
import {
  requestId,
  requireApiMember,
  validateMutationRequest,
  workflowErrorResponse,
} from "../../../lib/member-data";

export async function GET(request: Request) {
  const auth = await requireApiMember(request, "/favorites");
  if (auth.response) return auth.response;
  try {
    const favorites=await createD1AssetFavoritesRepository(auth.context.database).list(auth.context.workflowUser.id);
    return NextResponse.json({ favorites: favorites.map(publicFavorite) }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const rejected = validateMutationRequest(request);
  if (rejected) return rejected;
  const auth = await requireApiMember(request, "/favorites");
  if (auth.response) return auth.response;

  try {
    const body = (await request.json()) as { assetId?: unknown };
    const id=String(body.assetId ?? "");
    await ensureAssetReference(auth.context.database,id,auth.context.workflowUser.id);
    const result=await createD1AssetFavoritesRepository(auth.context.database).add(auth.context.workflowUser.id,id,requestId(request));
    return NextResponse.json(result, { status: result.created ? 201 : 200, headers:{"cache-control":"no-store"} });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  const rejected = validateMutationRequest(request);
  if (rejected) return rejected;
  const auth = await requireApiMember(request, "/favorites");
  if (auth.response) return auth.response;

  try {
    const body = (await request.json()) as { assetId?: unknown };
    const result=await createD1AssetFavoritesRepository(auth.context.database).remove(auth.context.workflowUser.id,String(body.assetId ?? ""),requestId(request));
    return NextResponse.json(result, {headers:{"cache-control":"no-store"}});
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
