"use client";

import { CheckCircle2, CreditCard, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function CheckoutAction({ checkoutId }: { checkoutId: string }) {
  const [state, setState] = useState<
    "idle" | "saving" | "complete" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  async function confirm() {
    setState("saving");
    setMessage("");
    try {
      const response = await fetch("/api/memberships/checkout/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ checkoutId }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "결제를 확인할 수 없습니다.");
      }
      setState("complete");
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error ? error.message : "결제를 확인할 수 없습니다.",
      );
    }
  }

  if (state === "complete") {
    return (
      <div className="checkout-complete" role="status">
        <CheckCircle2 size={28} />
        <div>
          <strong>멤버십이 활성화되었습니다</strong>
          <p>MY GLI에서 이용 기한과 상담 상태를 확인할 수 있습니다.</p>
        </div>
        <Link href="/my">MY GLI 열기</Link>
      </div>
    );
  }

  return (
    <div className="checkout-action">
      <button type="button" onClick={confirm} disabled={state === "saving"}>
        {state === "saving" ? (
          <LoaderCircle className="spin" size={18} />
        ) : (
          <CreditCard size={18} />
        )}
        테스트 결제 확인
      </button>
      <small>실제 카드 정보와 금액은 처리되지 않습니다.</small>
      {state === "error" && (
        <p className="form-status is-error" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
