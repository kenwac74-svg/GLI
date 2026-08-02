"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  EXPLORE_RETURN_KEY,
  EXPLORE_STATE_MAX_AGE_MS,
} from "../../../lib/explore-session";

export function BackToResultsButton({ assetId }: { assetId: string }) {
  const router = useRouter();

  function returnToResults() {
    const raw = window.sessionStorage.getItem(EXPLORE_RETURN_KEY);
    if (raw) {
      try {
        const state = JSON.parse(raw) as { assetId?: string; createdAt?: number };
        const isRecent =
          typeof state.createdAt === "number" &&
          Date.now() - state.createdAt < EXPLORE_STATE_MAX_AGE_MS;
        if (state.assetId === assetId && isRecent && window.history.length > 1) {
          router.back();
          return;
        }
      } catch {
        // Invalid or stale return state uses the safe home fallback.
      }
    }
    window.sessionStorage.removeItem(EXPLORE_RETURN_KEY);
    router.push("/");
  }

  return (
    <button className="back-link" type="button" onClick={returnToResults}>
      <ArrowLeft size={19} /> 탐색 결과로 돌아가기
    </button>
  );
}
