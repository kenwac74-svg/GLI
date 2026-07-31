"use client";

import {
  CheckCircle2,
  LoaderCircle,
  Save,
  ShieldOff,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type SourceFormData = {
  slug: string;
  approvalStatus: string;
  approvalReference: string | null;
  approvalExpiresAt: number | null;
  feedUrl: string | null;
  authorizationSecretName: string | null;
  maxRecordsPerRun: number;
};

export function SourceConfigForm({
  source,
  demoReadOnly,
}: {
  source: SourceFormData;
  demoReadOnly: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"SAVE" | "SUSPEND" | null>(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsError(false);
    const form = new FormData(event.currentTarget);
    if (demoReadOnly) {
      setMessage(
        "설정 검토가 완료되었습니다. 실운영 관리자 계정에서는 이 값으로 승인 기록이 저장됩니다.",
      );
      return;
    }

    setPending("SAVE");
    try {
      const expiry = String(form.get("approvalExpiresOn") ?? "");
      const response = await fetch("/api/admin/sources", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceSlug: source.slug,
          approvalReference: String(form.get("approvalReference") ?? ""),
          approvalExpiresAt: expiry
            ? Date.parse(`${expiry}T23:59:59.999Z`)
            : null,
          feedUrl: String(form.get("feedUrl") ?? ""),
          authorizationSecretName:
            String(form.get("authorizationSecretName") ?? "") || null,
          maxRecordsPerRun: Number(form.get("maxRecordsPerRun")),
        }),
      });
      const payload = (await response.json()) as {
        result?: { approvalStatus: string };
        error?: string;
      };
      if (!response.ok || !payload.result) {
        throw new Error(payload.error ?? "데이터 소스 설정을 저장하지 못했습니다.");
      }
      setMessage("이용 승인과 수집 연결 설정을 저장했습니다.");
      router.refresh();
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "데이터 소스 설정을 저장하지 못했습니다.",
      );
    } finally {
      setPending(null);
    }
  }

  async function suspend() {
    setMessage("");
    setIsError(false);
    if (demoReadOnly) {
      setMessage(
        "중지 절차를 확인했습니다. 실운영 관리자 계정에서는 이 소스가 즉시 차단됩니다.",
      );
      return;
    }

    setPending("SUSPEND");
    try {
      const response = await fetch("/api/admin/sources", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceSlug: source.slug,
          action: "SUSPEND",
        }),
      });
      const payload = (await response.json()) as {
        result?: { approvalStatus: string };
        error?: string;
      };
      if (!response.ok || !payload.result) {
        throw new Error(payload.error ?? "데이터 소스를 중지하지 못했습니다.");
      }
      setMessage("외부 수집 권한을 즉시 중지했습니다.");
      router.refresh();
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "데이터 소스를 중지하지 못했습니다.",
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <form className="source-config-form" onSubmit={save}>
      <label>
        <span>서면 승인 근거</span>
        <input
          name="approvalReference"
          defaultValue={source.approvalReference ?? ""}
          placeholder="계약서 번호 또는 내부 승인 문서 URL"
          minLength={6}
          maxLength={500}
          required
        />
      </label>
      <label>
        <span>승인 만료일 (UTC)</span>
        <input
          name="approvalExpiresOn"
          type="date"
          defaultValue={
            source.approvalExpiresAt
              ? new Date(source.approvalExpiresAt).toISOString().slice(0, 10)
              : ""
          }
        />
        <small>비워 두면 계약상 별도 만료일이 없는 승인으로 기록됩니다.</small>
      </label>
      <label className="source-field-wide">
        <span>라이선스 JSON 피드 주소</span>
        <input
          name="feedUrl"
          type="url"
          defaultValue={source.feedUrl ?? ""}
          placeholder="https://partner.example/api/gli/listings"
          required
        />
        <small>이 주소의 정확한 HTTPS 호스트만 수집 허용 목록에 등록됩니다.</small>
      </label>
      <label>
        <span>인증 비밀키 이름</span>
        <input
          name="authorizationSecretName"
          defaultValue={source.authorizationSecretName ?? ""}
          placeholder="SOURCE_SECRET_PARTNER_NAME"
          pattern="SOURCE_SECRET_[A-Z0-9_]{3,96}"
        />
        <small>비밀값이 아니라 작업자 환경에 등록된 이름만 저장합니다.</small>
      </label>
      <label>
        <span>1회 최대 매물 수</span>
        <input
          name="maxRecordsPerRun"
          type="number"
          defaultValue={source.maxRecordsPerRun}
          min={1}
          max={1000}
          required
        />
      </label>
      <label className="source-approval-check source-field-wide">
        <input name="approvalConfirmed" type="checkbox" required />
        <span>
          GLI가 이 피드를 수집·정규화·서비스에 표시할 수 있다는 서면 승인을
          확인했습니다.
        </span>
      </label>
      <div className="source-config-actions source-field-wide">
        <button type="submit" disabled={pending !== null}>
          {pending === "SAVE" ? (
            <LoaderCircle className="spin" size={16} />
          ) : demoReadOnly ? (
            <CheckCircle2 size={16} />
          ) : (
            <Save size={16} />
          )}
          {demoReadOnly ? "승인 설정 검토" : "승인 및 연결 저장"}
        </button>
        <button
          className="is-danger"
          type="button"
          onClick={suspend}
          disabled={pending !== null || source.approvalStatus === "SUSPENDED"}
        >
          {pending === "SUSPEND" ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <ShieldOff size={16} />
          )}
          수집 즉시 중지
        </button>
      </div>
      {message ? (
        <p className={isError ? "source-config-message is-error" : "source-config-message"}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
