"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { useUiLocale } from "./ui-locale-provider";

// GS-015: approved confirmation layout; no payment or account entitlement action.
export function AccessPreviewDialog({tier, title, onClose, onConfirm, heading, description, children, confirmLabel}:{tier:string;title:string;onClose:()=>void;onConfirm:()=>void;heading?:string;description?:string;children?:ReactNode;confirmLabel?:string}) {
  const {locale} = useUiLocale();
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLElement>("input:checked, button")?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);
  const english = locale === "en";
  return <div className="dlg-back" onClick={event=>{if(event.target===event.currentTarget)onClose();}}>
    <div ref={dialog} className="dlg" role="dialog" aria-modal="true" aria-labelledby="access-preview-title"
      onKeyDown={event=>{
        if(event.key==="Escape")onClose();
        if(event.key==="Tab") {
          const buttons=dialog.current?.querySelectorAll<HTMLElement>("input:checked, button:not(:disabled)");
          if(!buttons?.length)return;
          const first=buttons[0],last=buttons[buttons.length-1];
          if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
          else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
        }
      }}>
      <span className="kicker" style={{color:"var(--green)"}}>{children ? "Payment" : "Asset Access"}</span>
      <h3 id="access-preview-title" style={{fontSize:24,margin:"6px 0 8px"}}>{heading ?? `${tier} ${english?"information":"정보 열람"}`}</h3>
      <p style={{fontSize:15,color:"var(--ink-2)"}}>{description ?? (english?"View the available information. No payment or balance deduction occurs.":"준비된 정보를 확인합니다. 결제나 잔액 차감은 발생하지 않습니다.")}</p>
      {title && <dl><div><dt>{english?"Asset":"대상 자산"}</dt><dd>{title}</dd></div></dl>}
      {children}
      <div style={{display:"flex",gap:12}}>
        <button type="button" className="btn btn-o" style={{flex:1}} onClick={onClose}>{english?"Cancel":"취소"}</button>
        <button type="button" className="btn btn-p" style={{flex:1}} onClick={onConfirm}>{confirmLabel ?? (english?"View information":"정보 보기")}</button>
      </div>
    </div>
  </div>;
}
