"use client";

import { CreditCard, LoaderCircle } from "lucide-react";
import { useState } from "react";

export function MembershipAction({ planId }: { planId: string }) {
  const [state, setState] = useState<
    "idle" | "saving" | "active" | "error"
  >("idle");

  async function startCheckout() {
    setState("saving");
    try {
      const response = await fetch("/api/memberships/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const payload = (await response.json()) as {
        checkoutUrl?: string;
        signInPath?: string;
        error?: string;
      };
      if (response.status === 401 && payload.signInPath) {
        window.location.assign(payload.signInPath);
        return;
      }
      if (!response.ok) throw new Error(payload.error ?? "활성화할 수 없습니다.");
      if (!payload.checkoutUrl) throw new Error("결제 화면을 열 수 없습니다.");
      window.location.assign(payload.checkoutUrl);
    } catch {
      setState("error");
    }
  }

  return (
    <div className="membership-action">
      <button
        type="button"
        onClick={startCheckout}
        disabled={state === "saving" || state === "active"}
      >
        {state === "saving" ? (
          <LoaderCircle className="spin" size={18} />
        ) : (
          <CreditCard size={18} />
        )}
        {state === "active"
          ? "결제 준비 완료"
          : state === "error"
            ? "다시 시도"
            : "멤버십 선택"}
      </button>
    </div>
  );
}
