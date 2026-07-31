"use client";

import {
  Activity,
  CalendarCheck2,
  Check,
  CheckCheck,
  CircleX,
  Eye,
  LoaderCircle,
  PhoneCall,
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

export function OperationsHealthAction() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function scan() {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/operations/health", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      const payload = (await response.json()) as {
        result?: { activeAlerts: number; resolvedAlerts: number };
        error?: string;
      };
      if (!response.ok || !payload.result) {
        throw new Error(payload.error ?? "운영 상태 점검에 실패했습니다.");
      }
      setMessage(
        `활성 경보 ${payload.result.activeAlerts}건 · 자동 해제 ${payload.result.resolvedAlerts}건`,
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "운영 상태 점검에 실패했습니다.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="ops-action">
      <button type="button" onClick={scan} disabled={pending}>
        {pending ? (
          <LoaderCircle className="spin" size={16} />
        ) : (
          <Activity size={16} />
        )}
        상태 점검
      </button>
      {message ? <small>{message}</small> : <small>운영 위험 신호를 다시 계산합니다.</small>}
    </div>
  );
}

export function OperationalAlertActions({
  alertId,
  status,
}: {
  alertId: number;
  status: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function update(nextStatus: "ACKNOWLEDGED" | "RESOLVED") {
    setPending(nextStatus);
    setMessage("");
    try {
      const response = await fetch("/api/admin/operations/alerts", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ alertId, status: nextStatus }),
      });
      const payload = (await response.json()) as {
        result?: { status: string };
        error?: string;
      };
      if (!response.ok || !payload.result) {
        throw new Error(payload.error ?? "경보 상태를 변경할 수 없습니다.");
      }
      setMessage(nextStatus === "RESOLVED" ? "해결 처리" : "확인 처리");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "경보 상태를 변경할 수 없습니다.",
      );
    } finally {
      setPending(null);
    }
  }

  if (status === "RESOLVED") {
    return <span className="consultation-final">해결됨</span>;
  }

  return (
    <div className="review-actions">
      <button
        type="button"
        title="담당자가 경보를 확인함"
        onClick={() => update("ACKNOWLEDGED")}
        disabled={pending !== null || status === "ACKNOWLEDGED"}
      >
        {pending === "ACKNOWLEDGED" ? (
          <LoaderCircle className="spin" size={15} />
        ) : (
          <Eye size={15} />
        )}
        {status === "ACKNOWLEDGED" ? "확인됨" : "확인"}
      </button>
      <button
        type="button"
        title="경보 해결 처리"
        onClick={() => update("RESOLVED")}
        disabled={pending !== null}
      >
        {pending === "RESOLVED" ? (
          <LoaderCircle className="spin" size={15} />
        ) : (
          <CheckCheck size={15} />
        )}
        해결
      </button>
      {message ? <small>{message}</small> : null}
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

type ConsultationStatus =
  | "RECEIVED"
  | "CONTACTED"
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELLED";

export function ConsultationAdminActions({
  consultationId,
  status,
}: {
  consultationId: string;
  status: ConsultationStatus;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<ConsultationStatus | null>(null);
  const [message, setMessage] = useState("");

  async function update(nextStatus: ConsultationStatus) {
    setPending(nextStatus);
    setMessage("");
    try {
      const response = await fetch("/api/admin/consultations", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ consultationId, status: nextStatus }),
      });
      const payload = (await response.json()) as {
        result?: { status: string };
        error?: string;
      };
      if (!response.ok || !payload.result) {
        throw new Error(payload.error ?? "상담 상태를 변경할 수 없습니다.");
      }
      setMessage("변경 완료");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "상담 상태를 변경할 수 없습니다.",
      );
    } finally {
      setPending(null);
    }
  }

  if (status === "COMPLETED" || status === "CANCELLED") {
    return <span className="consultation-final">처리 종료</span>;
  }

  const next =
    status === "RECEIVED"
      ? { status: "CONTACTED" as const, label: "담당 시작", icon: PhoneCall }
      : status === "CONTACTED"
        ? {
            status: "SCHEDULED" as const,
            label: "일정 확정",
            icon: CalendarCheck2,
          }
        : { status: "COMPLETED" as const, label: "상담 완료", icon: Check };
  const NextIcon = next.icon;

  return (
    <div className="consultation-admin-actions">
      <button
        type="button"
        onClick={() => update(next.status)}
        disabled={pending !== null}
      >
        {pending === next.status ? (
          <LoaderCircle className="spin" size={15} />
        ) : (
          <NextIcon size={15} />
        )}
        {next.label}
      </button>
      <button
        className="is-cancel"
        type="button"
        title="상담 요청 취소 처리"
        aria-label="상담 요청 취소 처리"
        onClick={() => update("CANCELLED")}
        disabled={pending !== null}
      >
        {pending === "CANCELLED" ? (
          <LoaderCircle className="spin" size={15} />
        ) : (
          <CircleX size={15} />
        )}
      </button>
      {message ? <small>{message}</small> : null}
    </div>
  );
}
