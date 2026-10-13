import { NextResponse } from "next/server";
import { createD1MemberInquiryRepository } from "../../../db/member-inquiry-repository.ts";
import { ensureAssetReference } from "../../../lib/asset-reference-service.ts";
import { requestId,requireApiMember,validateMutationRequest,workflowErrorResponse } from "../../../lib/member-data";
export async function POST(request:Request) {
  const rejected=validateMutationRequest(request);if(rejected)return rejected;
  const auth=await requireApiMember(request,"/my?inquiry=1");if(auth.response)return auth.response;
  try {
    const body=await request.json() as {assetId?:unknown;submissionKey?:unknown;requestText?:unknown;contact?:unknown};
    if(body.assetId!==undefined && body.assetId!==null && typeof body.assetId!=="string")throw new TypeError("Invalid asset ID");
    const assetId=typeof body.assetId==="string" && body.assetId ? body.assetId : null;
    const ref=assetId ? await ensureAssetReference(auth.context.database,assetId,auth.context.workflowUser.id) : null;
    const result=await createD1MemberInquiryRepository(auth.context.database).create({userId:auth.context.workflowUser.id,
      submissionKey:body.submissionKey,requestText:body.requestText,contact:body.contact,assetId:ref?.publicId,
      requestId:requestId(request)});
    return NextResponse.json(result,{status:result.created?201:200,headers:{"cache-control":"no-store"}});
  } catch(error){return workflowErrorResponse(error);}
}
