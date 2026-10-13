"use client";
import { LoaderCircle, Send, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function RemoveFavoriteButton({assetId}:{assetId:string}) {
  const router=useRouter();
  const [saving,setSaving]=useState(false),[error,setError]=useState(false);
  const busy=useRef(false);
  async function removeFavorite() {
    if(busy.current)return;
    busy.current=true;setSaving(true);setError(false);
    try {
      const response=await fetch("/api/favorites",{method:"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({assetId})});
      if(!response.ok)throw new Error("Removal failed");
      router.refresh();
    } catch {setError(true);} finally {busy.current=false;setSaving(false);}
  }
  return <div><button className="icon-action" type="button" onClick={removeFavorite} disabled={saving}
    title="관심 자산에서 삭제" aria-label="관심 자산에서 삭제">
    {saving?<LoaderCircle className="spin" size={17}/>:<Trash2 size={17}/>}
  </button>{error&&<small role="alert">해제하지 못했습니다. 다시 시도해 주세요.</small>}</div>;
}

// GS-020: receipt-only inbox, not a booking or expert assignment operation.
export function ConsultationForm({assetId,assetTitle,memberName,memberEmail}:{assetId?:string;assetTitle?:string;memberName:string;memberEmail:string}) {
  const [state,setState]=useState<"idle"|"saving"|"saved"|"error">("idle");
  const [message,setMessage]=useState(""),[contact,setContact]=useState("");
  const [receipt,setReceipt]=useState("");
  const busy=useRef(false);
  const attempt=useRef<{key:string;body:string}|null>(null);
  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();if(busy.current)return;
    busy.current=true;setState("saving");
    const body=JSON.stringify({assetId,requestText:message.trim(),contact:contact.trim()});
    if(attempt.current?.body!==body)attempt.current={key:crypto.randomUUID(),body};
    try {
      const response=await fetch("/api/inquiries",{method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({...JSON.parse(body),submissionKey:attempt.current.key})});
      const result=await response.json() as {receiptNumber?:string};
      if(!response.ok || !result.receiptNumber)throw new Error("Inquiry not saved");
      setReceipt(result.receiptNumber);setState("saved");
    } catch {setState("error");} finally {busy.current=false;}
  }
  if(state==="saved")return <section className="consultation-form" role="status">
    <h2>문의 접수 완료</h2><p>접수번호 <strong>{receipt}</strong></p>
  </section>;
  return <form className="consultation-form" onSubmit={submit}>
    <div className="workflow-section-head"><div><span>INQUIRY</span><h2>전문가 문의하기</h2></div></div>
    {assetTitle&&<p className="selected-asset">관련 자산: {assetTitle}</p>}
    <label>이름<input value={memberName} readOnly/></label>
    <label>이메일<input type="email" value={memberEmail} readOnly/></label>
    <label>문의 내용<textarea required minLength={5} maxLength={2000} value={message} disabled={state==="saving"}
      onChange={event=>setMessage(event.target.value)} /></label>
    <label>연락처 <span>(선택)</span><input type="text" maxLength={120} value={contact} disabled={state==="saving"}
      onChange={event=>setContact(event.target.value)}/></label>
    <button type="submit" disabled={state==="saving"}>
      {state==="saving"?<LoaderCircle className="spin" size={18}/>:<Send size={18}/>}
      {state==="saving"?"접수 중":"문의 접수"}
    </button>
    {state==="error"&&<p className="form-status is-error" role="alert">접수를 확인하지 못했습니다. 입력 내용은 유지되었습니다. 다시 시도해 주세요.</p>}
  </form>;
}
