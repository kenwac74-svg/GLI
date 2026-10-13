import test from "node:test";
import assert from "node:assert/strict";
import { migratedDatabase } from "./support/sqlite-d1.mjs";
import { ensureUser } from "../db/user-workflows.ts";
import { createD1MemberInquiryRepository } from "../db/member-inquiry-repository.ts";
import { createD1AssetReferenceRepository } from "../db/asset-reference-repository.ts";
import { assets } from "../lib/assets.ts";

test("inquiry saves member identity, optional contact and external reference with one receipt",async()=>{
  const {sqlite,database}=migratedDatabase();
  try {
    const user=await ensureUser(database,{email:"member@example.com",displayName:"Member"});
    await createD1AssetReferenceRepository(database).upsertSnapshot({...assets[0],id:"inquiry-external",sourceUrl:"https://example.com/inquiry",sourceName:"Portal"},"2026-10-13T00:00:00Z","discovery");
    const repository=createD1MemberInquiryRepository(database);
    const input={userId:user.id,submissionKey:"request-0000000000000001",requestText:"Please confirm this property",contact:"010-1234-5678",assetId:"inquiry-external"};
    const first=await repository.create(input),second=await repository.create(input);
    assert.equal(first.created,true);assert.equal(second.created,false);
    assert.equal(first.receiptNumber,second.receiptNumber);
    const row=sqlite.prepare("SELECT * FROM member_inquiries").get();
    assert.equal(row.member_email,"member@example.com");assert.equal(row.member_name,"Member");
    assert.equal(row.contact,"010-1234-5678");assert.equal(row.asset_public_id,"inquiry-external");
    assert.equal(row.status,"RECEIVED");
    assert.equal(sqlite.prepare("SELECT count(*) n FROM consultations").get().n,0);
    assert.equal(sqlite.prepare("SELECT count(*) n FROM audit_logs WHERE action='MEMBER_INQUIRY_RECEIVED'").get().n,1);
    await assert.rejects(()=>repository.create({...input,requestText:"Different message"}),TypeError);
  } finally {sqlite.close();}
});
test("general inquiries allow no contact; account isolation and inactive/input gates hold",async()=>{
  const {sqlite,database}=migratedDatabase();
  try {
    const a=await ensureUser(database,{email:"a@example.com"}),b=await ensureUser(database,{email:"b@example.com"});
    const repository=createD1MemberInquiryRepository(database);
    const input={userId:a.id,submissionKey:"request-0000000000000002",requestText:"General inquiry"};
    const x=await repository.create(input),y=await repository.create({...input,userId:b.id});
    assert.notEqual(x.receiptNumber,y.receiptNumber);
    assert.equal(sqlite.prepare("SELECT contact FROM member_inquiries LIMIT 1").get().contact,null);
    await assert.rejects(()=>repository.create({...input,requestText:""}),TypeError);
    await assert.rejects(()=>repository.create({...input,contact:"x".repeat(121)}),TypeError);
    sqlite.prepare("UPDATE users SET status='SUSPENDED' WHERE id=?").run(b.id);
    await assert.rejects(()=>repository.create({...input,userId:b.id}),/not active/);
  } finally {sqlite.close();}
});

test("concurrent receipt retries create one row and failed audit rolls back the receipt",async()=>{
  const {sqlite,database}=migratedDatabase();
  try {
    const user=await ensureUser(database,{email:"retry@example.com"});
    const repository=createD1MemberInquiryRepository(database);
    const input={userId:user.id,submissionKey:"request-0000000000000003",requestText:"Concurrent inquiry"};
    const responses=await Promise.all([repository.create(input),repository.create(input)]);
    assert.equal(responses.filter(row=>row.created).length,1);
    assert.equal(responses[0].receiptNumber,responses[1].receiptNumber);
    sqlite.exec("CREATE TRIGGER fail_inquiry_audit BEFORE INSERT ON audit_logs WHEN NEW.action='MEMBER_INQUIRY_RECEIVED' BEGIN SELECT RAISE(ABORT,'audit failed'); END");
    await assert.rejects(()=>repository.create({...input,submissionKey:"request-0000000000000004"}),/audit failed/);
    assert.equal(sqlite.prepare("SELECT count(*) n FROM member_inquiries").get().n,1);
  } finally {sqlite.close();}
});
