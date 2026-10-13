import { NextResponse } from "next/server";
import { createD1AssetReferenceRepository } from "../../../../../db/asset-reference-repository.ts";
import { createD1AssetFavoritesRepository, readRetainedListing } from "../../../../../db/asset-favorites-repository.ts";
import { getWorkflowDatabase, requireApiMember, workflowErrorResponse } from "../../../../../lib/member-data.ts";
import { validAssetId } from "../../../../../lib/asset-content.ts";
import { getAsset } from "../../../../../lib/assets-data.ts";

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {
  try {
    const id=validAssetId((await params).id);
    const database=await getWorkflowDatabase();
    const repository=createD1AssetReferenceRepository(database);
    const ref=await repository.get(id);
    if (!ref) {
      if(!(await getAsset(id)).asset) return NextResponse.json({error:"Asset not found"},{status:404,headers:{"cache-control":"no-store"}});
      return NextResponse.json({assetId:id,entries:[],historyAvailable:false,windowVersionLimit:500},{headers:{"cache-control":"no-store"}});
    }
    if (ref.kind==="listing" && (await readRetainedListing(database,id))?.status!=="ACTIVE") {
      const auth=await requireApiMember(request,"/favorites");
      if (auth.response) return auth.response;
      if (!await createD1AssetFavoritesRepository(database).contains(auth.context.workflowUser.id,id)) {
        return NextResponse.json({error:"Asset not found"},{status:404,headers:{"cache-control":"no-store"}});
      }
    }
    return NextResponse.json({assetId:id,entries:await repository.priceHistory(id),windowVersionLimit:500},
      {headers:{"cache-control":"no-store"}});
  } catch (error) { return workflowErrorResponse(error); }
}
