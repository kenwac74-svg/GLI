import type { D1DatabaseLike } from "./user-workflows.ts";
import { validAssetId } from "../lib/asset-content.ts";

type Input = {userId:string;submissionKey:unknown;requestText:unknown;contact?:unknown;assetId?:string|null;requestId?:string};
const boundedText=(value:unknown,min:number,max:number,label:string)=>{
  if(typeof value!=="string" || value.trim().length<min || value.trim().length>max)throw new TypeError(`${label} must contain ${min}-${max} characters`);
  return value.trim();
};
export function createD1MemberInquiryRepository(database:D1DatabaseLike) {
  return {async create(input:Input) {
    const key=boundedText(input.submissionKey,16,128,"Submission key");
    if(!/^[a-zA-Z0-9_-]+$/.test(key))throw new TypeError("Invalid submission key");
    const message=boundedText(input.requestText,5,2000,"Message");
    const contact=input.contact===undefined || input.contact===null || input.contact==="" ? null : boundedText(input.contact,1,120,"Contact");
    const assetId=input.assetId ? validAssetId(input.assetId) : null;
    const user=await database.prepare("SELECT status FROM users WHERE id=?").bind(input.userId).first<{status:string}>();
    if(user?.status!=="ACTIVE")throw new TypeError("Account not active");
    const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify({message,contact,assetId})));
    const hash=Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,"0")).join("");
    const receipt=`GLI-${crypto.randomUUID().replaceAll("-","").slice(0,20).toUpperCase()}`;
    if(!database.batch)throw new Error("Atomic inquiry storage unavailable");
    const result=await database.batch([
      database.prepare(`INSERT INTO member_inquiries(receipt_number,user_id,submission_key,input_hash,member_name,member_email,asset_public_id,request_text,contact,status,created_at)
        SELECT ?,id,?,?,display_name,email,?,?,?,'RECEIVED',? FROM users WHERE id=? AND status='ACTIVE'
        ON CONFLICT(user_id,submission_key) DO NOTHING RETURNING receipt_number`)
        .bind(receipt,key,hash,assetId,message,contact,Date.now(),input.userId),
      database.prepare(`INSERT INTO audit_logs(actor_user_id,action,resource_type,resource_id,before_json,after_json,request_id,created_at)
        SELECT ?,'MEMBER_INQUIRY_RECEIVED','MEMBER_INQUIRY',?,NULL,?, ?,? WHERE changes()>0`)
        .bind(input.userId,receipt,JSON.stringify({assetId}),input.requestId ?? null,Date.now()),
    ]);
    if(result.some(row=>row.success===false))throw new Error("Inquiry storage failed");
    const saved=await database.prepare("SELECT receipt_number,input_hash FROM member_inquiries WHERE user_id=? AND submission_key=?")
      .bind(input.userId,key).first<{receipt_number:string;input_hash:string}>();
    if(!saved)throw new Error("Inquiry was not saved");
    if(saved.input_hash!==hash)throw new TypeError("Submission key already used for different content");
    return {receiptNumber:saved.receipt_number,status:"RECEIVED" as const,created:Boolean(result[0].results?.length)};
  }};
}
