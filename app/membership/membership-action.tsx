"use client";

import { CreditCard, LoaderCircle } from "lucide-react";
import { useState } from "react";

export function MembershipAction({ planId }: { planId: string }) {
  const [state, setState] = useState<
    "idle" | "saving" | "active" | "error"
  >("idle");

  async function activateDemoMembership() {
    setState("saving");
    try {
      const response = await fetch("/api/memberships/demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const payload = (await response.json()) as {
        signInPath?: string;
        error?: string;
      };
      if (response.status === 401 && payload.signInPath) {
        window.location.assign(payload.signInPath);
        return;
      }
      if (!response.ok) throw new Error(payload.error ?? "활성화할 수 없습니다.");
      setState("active");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="membership-action">
      <button
        type="button"
        onClick={activateDemoMembership}
        disabled={state === "saving" || state === "active"}
      >
        {state === "saving" ? (
          <LoaderCircle className="spin" size={18} />
        ) : (
          <CreditCard size={18} />
        )}
        {state === "active"
          ? "데모 멤버십 활성화됨"
          : state === "error"
            ? "다시 시도"
            : "데모 멤버십 활성화"}
      </button>
      {state === "active" && (
        <a href="/my">MY GLI에서 확인</a>
      )}
    </div>
  );
}
