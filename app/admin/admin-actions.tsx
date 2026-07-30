"use client";

import {
  Check,
  LoaderCircle,
  PauseCircle,
  Play,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ActionState = {
  key: string;
  message: string;
  error: boolean;
} | null;

export function IngestionAction() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<ActionState>(null);

  async function run() {
    setPending(true);
    setState(null);
    try {
      const response = await fetch("/api/admin/ingestion/demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      const payload = (await response.json()) as {
        result?: { acceptedCount: number; rejectedCount: number };
        error?: string;
      };
      if (!response.ok || !payload.result) {
        throw new Error(payload.error ?? "수집 실행에 실패했습니다.");
      }
      setState({
        key: "run",
        message: `${payload.result.acceptedCount}건 반영, ${payload.result.rejectedCount}건 제외`,
        error: false,
      });
      router.refresh();
    } catch (error) {
      setState({
        key: "run",
        message:
          error instanceof Error ? error.message : "수집 실행에 실패했습니다.",
        error: true,
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="ops-action">
      <button type="button" onClick={run} disabled={pending}>
        {pending ? (
          <LoaderCircle className="spin" size={16} />
        ) : (
          <Play size={16} fill="currentColor" />
        )}
        승인 데모 피드 실행
      </button>
      {state ? (
        <small className={state.error ? "is-error" : ""}>{state.message}</small>
      ) : (
        <small>승인된 내부 데모 자료 2건을 수집합니다.</small>
      )}
    </div>
  );
}

export function ListingReviewActions({
  publicId,
  status,
}: {
  publicId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<ReviewAction | null>(null);
  const [message, setMessage] = useState("");

  type ReviewAction = "PUBLISH" | "HOLD";

  async function submit(action: ReviewAction) {
    setPending(action);
    setMessage("");
    try {
      const response = await fetch("/api/admin/listings/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ publicId, action }),
      });
      const payload = (await response.json()) as {
        result?: { status: string };
        error?: string;
      };
      if (!response.ok || !payload.result) {
        throw new Error(payload.error ?? "상태 변경에 실패했습니다.");
      }
      setMessage(action === "PUBLISH" ? "게시 완료" : "보류 완료");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "상태 변경에 실패했습니다.",
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="review-actions">
      <button
        type="button"
        title="사용자 검색에 게시"
        onClick={() => submit("PUBLISH")}
        disabled={pending !== null || status === "ACTIVE"}
      >
        {pending === "PUBLISH" ? (
          <LoaderCircle className="spin" size={15} />
        ) : status === "ACTIVE" ? (
          <Check size={15} />
        ) : (
          <RefreshCw size={15} />
        )}
        {status === "ACTIVE" ? "게시됨" : "게시"}
      </button>
      <button
        type="button"
        title="사용자 검색에서 보류"
        onClick={() => submit("HOLD")}
        disabled={pending !== null || status === "HELD"}
      >
        {pending === "HOLD" ? (
          <LoaderCircle className="spin" size={15} />
        ) : (
          <PauseCircle size={15} />
        )}
        보류
      </button>
      {message ? <small>{message}</small> : null}
    </div>
  );
}
