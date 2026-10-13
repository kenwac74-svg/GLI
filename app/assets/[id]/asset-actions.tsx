"use client";

import { Heart, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { readFavorites } from "../../../lib/favorite-client";

export function AssetActions({ assetId }: { assetId: string }) {
  const [state, setState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    void readFavorites().then(result => {
      if (active && result.ok) {
        const exists = Boolean(result.favorites?.some(row => row.referenceIds?.includes(assetId) || (row.referenceId ?? row.publicId) === assetId));
        setSaved(exists);
        setState(exists ? "saved" : "idle");
      }
    }).catch(() => { /* A failed read must not claim that a favorite is saved. */ })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [assetId]);

  async function addFavorite() {
    const removing = saved;
    setState("saving");
    setErrorMessage("");
    try {
      const response = await fetch("/api/favorites", {
        method: removing ? "DELETE" : "POST",
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
      setState(removing ? "idle" : "saved");
      setSaved(!removing);
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
      className={`secondary-action ${saved ? "is-saved" : ""}`}
        type="button"
        onClick={addFavorite}
        disabled={state === "saving" || !loaded}
        aria-pressed={saved}
      >
        {state === "saving" ? (
          <LoaderCircle className="spin" size={18} />
        ) : (
          <Heart size={18} fill={saved ? "currentColor" : "none"} />
        )}
        {state === "saved"
          ? "관심 자산에서 해제"
          : state === "error"
            ? saved ? "다시 해제하기" : "다시 저장하기"
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
