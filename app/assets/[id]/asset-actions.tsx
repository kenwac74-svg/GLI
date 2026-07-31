"use client";

import { Heart, LoaderCircle } from "lucide-react";
import { useState } from "react";

export function AssetActions({ assetId }: { assetId: string }) {
  const [state, setState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function addFavorite() {
    setState("saving");
    setErrorMessage("");
    try {
      const response = await fetch("/api/favorites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetId }),
      });
      const payload = (await response.json()) as {
        signInPath?: string;
        error?: string;
      };
      if (response.status === 401 && payload.signInPath) {
        window.location.assign(payload.signInPath);
        return;
      }
      if (!response.ok) throw new Error(payload.error ?? "저장할 수 없습니다.");
      setState("saved");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.",
      );
      setState("error");
    }
  }

  return (
    <>
      <button
        className={`secondary-action ${state === "saved" ? "is-saved" : ""}`}
        type="button"
        onClick={addFavorite}
        disabled={state === "saving" || state === "saved"}
      >
        {state === "saving" ? (
          <LoaderCircle className="spin" size={18} />
        ) : (
          <Heart size={18} fill={state === "saved" ? "currentColor" : "none"} />
        )}
        {state === "saved"
          ? "관심 자산에 저장됨"
          : state === "error"
            ? "다시 저장하기"
            : "관심 자산에 추가"}
      </button>
      {state === "error" && (
        <p className="action-message is-error" role="status">
          {errorMessage}
          {errorMessage.includes("한도") && (
            <>
              {" "}
              <a href="/membership">멤버십 보기</a>
            </>
          )}
        </p>
      )}
    </>
  );
}
