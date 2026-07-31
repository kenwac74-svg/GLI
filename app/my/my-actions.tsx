"use client";

import { LoaderCircle, Send, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RemoveFavoriteButton({ assetId }: { assetId: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function removeFavorite() {
    setSaving(true);
    const response = await fetch("/api/favorites", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assetId }),
    });
    if (response.ok) {
      router.refresh();
      return;
    }
    setSaving(false);
  }

  return (
    <button
      className="icon-action"
      type="button"
      onClick={removeFavorite}
      disabled={saving}
      title="관심 자산에서 삭제"
      aria-label="관심 자산에서 삭제"
    >
      {saving ? <LoaderCircle className="spin" size={17} /> : <Trash2 size={17} />}
    </button>
  );
}

export function ConsultationForm({
  assetId,
  assetTitle,
}: {
  assetId?: string;
  assetTitle?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [message, setMessage] = useState(
    assetTitle
      ? `${assetTitle}의 현지 확인 범위와 계약 추진 절차를 상담하고 싶습니다.`
      : "",
  );
  const [preferredAt, setPreferredAt] = useState("");
  const [priorityLabel, setPriorityLabel] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("saving");
    const response = await fetch("/api/consultations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assetId, requestText: message, preferredAt }),
    });
    if (response.ok) {
      const result = (await response.json()) as {
        priority?: "STANDARD" | "PRIORITY" | "PRIVATE";
      };
      setPriorityLabel(consultationPriority(result.priority));
      setState("saved");
      setMessage("");
      setPreferredAt("");
      router.refresh();
      return;
    }
    setState("error");
  }

  return (
    <form className="consultation-form" onSubmit={submit}>
      <div className="workflow-section-head">
        <div>
          <span>CONSULTATION</span>
          <h2>{assetTitle ? "이 자산 상담 신청" : "전문가 상담 신청"}</h2>
        </div>
      </div>
      {assetTitle && <p className="selected-asset">{assetTitle}</p>}
      <label>
        문의 내용
        <textarea
          required
          minLength={5}
          maxLength={2000}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="예산, 투자 목적, 확인이 필요한 내용을 적어주세요."
        />
      </label>
      <label>
        희망 일시 <span>(선택)</span>
        <input
          type="datetime-local"
          value={preferredAt}
          onChange={(event) => setPreferredAt(event.target.value)}
        />
      </label>
      <button type="submit" disabled={state === "saving"}>
        {state === "saving" ? (
          <LoaderCircle className="spin" size={18} />
        ) : (
          <Send size={18} />
        )}
        {state === "saved" ? "상담 접수 완료" : "상담 신청"}
      </button>
      {state === "saved" && (
        <p className="form-status is-success" role="status">
          {priorityLabel}으로 접수되었습니다. MY GLI에서 진행 상태를 확인할 수
          있습니다.
        </p>
      )}
      {state === "error" && (
        <p className="form-status is-error" role="status">
          접수하지 못했습니다. 입력 내용을 확인해 다시 시도해 주세요.
        </p>
      )}
    </form>
  );
}

function consultationPriority(
  priority: "STANDARD" | "PRIORITY" | "PRIVATE" | undefined,
): string {
  if (priority === "PRIVATE") return "전담 상담";
  if (priority === "PRIORITY") return "우선 상담";
  return "일반 상담";
}
