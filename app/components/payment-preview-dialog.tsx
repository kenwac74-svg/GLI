"use client";
import { useState } from "react";
import { CreditCard } from "lucide-react";
import { PAYMENT_PREVIEW_METHODS, type PaymentPreviewMethod } from "../../lib/payment-preview";
import { AccessPreviewDialog } from "./access-preview-dialog";
import { useUiLocale } from "./ui-locale-provider";

// GS-018: selection-only preview. Real provider handoff requires a server order.
export function PaymentPreviewDialog({initialMethod,onClose,onSelect}:{initialMethod:PaymentPreviewMethod|null;onClose:()=>void;onSelect:(method:PaymentPreviewMethod)=>void}) {
  const [method,setMethod]=useState<PaymentPreviewMethod>(initialMethod ?? PAYMENT_PREVIEW_METHODS[0]);
  const {locale}=useUiLocale();
  const english=locale==="en";
  const labels=["Naver Pay","Kakao Pay","Toss Pay","Credit card"];
  return <AccessPreviewDialog tier="PAYMENT" title="" onClose={onClose} onConfirm={()=>onSelect(method)}
    heading={english?"Payment method":"결제 수단 선택"} confirmLabel={english?"Confirm selection":"선택 완료"}
    description={english?"No payment request is sent.":"결제 요청은 전송되지 않습니다."}>
    <fieldset style={{border:0,padding:0,margin:"20px 0"}} aria-label={english?"Payment method":"결제 수단"}>
      {PAYMENT_PREVIEW_METHODS.map((item,index)=><label key={item} className="btn btn-o" style={{display:"flex",gap:12,width:"100%",marginBottom:8,justifyContent:"flex-start"}}>
        <input type="radio" name="payment-method" value={item} checked={method===item} onChange={()=>setMethod(item)} />
        {index===3 && <CreditCard size={18} aria-hidden="true" />}
        {english?labels[index]:item}
      </label>)}
    </fieldset>
  </AccessPreviewDialog>;
}
