"use client";

import { LoaderCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type RestoreResult = "NOT_TESTED" | "SUCCEEDED" | "FAILED";

export function BackupEvidenceForm({
  demoReadOnly,
}: {
  demoReadOnly: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [restoreResult, setRestoreResult] =
    useState<RestoreResult>("NOT_TESTED");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsError(false);
    if (demoReadOnly) {
      setMessage("공개 데모에서는 입력 형식만 확인할 수 있습니다.");
      return;
    }

    const form = new FormData(event.currentTarget);
    setPending(true);
    try {
      const response = await fetch("/api/admin/readiness/backups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          environment: form.get("environment"),
          storageProvider: form.get("storageProvider"),
          objectKey: form.get("objectKey"),
          manifestSha256: form.get("manifestSha256"),
          capturedAt: toTimestamp(form.get("capturedAt")),
          restoreResult,
          restoreTestedAt:
            restoreResult === "NOT_TESTED"
              ? null
              : toTimestamp(form.get("restoreTestedAt")),
          notes: form.get("notes") || null,
        }),
      });
      const payload = (await response.json()) as {
        result?: { restoreResult: string };
        error?: string;
      };
      if (!response.ok || !payload.result) {
        throw new Error(payload.error ?? "백업 증적을 저장하지 못했습니다.");
      }
      setMessage(
        payload.result.restoreResult === "SUCCEEDED"
          ? "복원 성공 증적을 저장했습니다."
          : "백업 증적을 저장했습니다.",
      );
      router.refresh();
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "백업 증적을 저장하지 못했습니다.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="backup-evidence-form" onSubmit={submit}>
      <fieldset disabled={pending}>
        <label>
          <span>환경</span>
          <select name="environment" defaultValue="STAGING">
            <option value="STAGING">스테이징</option>
            <option value="PRODUCTION">프로덕션</option>
          </select>
        </label>
        <label>
          <span>보관 방식</span>
          <select name="storageProvider" defaultValue="R2">
            <option value="R2">Cloudflare R2</option>
            <option value="CLOUDFLARE_EXPORT">Cloudflare 내보내기</option>
            <option value="OTHER">승인된 기타 저장소</option>
          </select>
        </label>
        <label className="backup-field-wide">
          <span>백업 객체 키</span>
          <input
            name="objectKey"
            placeholder="backups/production/gli-2026-07-31.sqlite"
            minLength={3}
            maxLength={256}
            required
          />
          <small>버킷 이름이 아닌 저장소 내부 객체 키를 입력합니다.</small>
        </label>
        <label className="backup-field-wide">
          <span>매니페스트 SHA-256</span>
          <input
            name="manifestSha256"
            placeholder="64자리 SHA-256"
            pattern="[A-Fa-f0-9]{64}"
            maxLength={64}
            required
          />
        </label>
        <label>
          <span>백업 생성 시각</span>
          <input name="capturedAt" type="datetime-local" required />
        </label>
        <label>
          <span>복원 결과</span>
          <select
            name="restoreResult"
            value={restoreResult}
            onChange={(event) =>
              setRestoreResult(event.target.value as RestoreResult)
            }
          >
            <option value="NOT_TESTED">아직 테스트하지 않음</option>
            <option value="SUCCEEDED">복원 성공</option>
            <option value="FAILED">복원 실패</option>
          </select>
        </label>
        <label>
          <span>복원 테스트 시각</span>
          <input
            name="restoreTestedAt"
            type="datetime-local"
            required={restoreResult !== "NOT_TESTED"}
            disabled={restoreResult === "NOT_TESTED"}
          />
        </label>
        <label>
          <span>운영 메모</span>
          <input
            name="notes"
            placeholder="티켓 또는 점검 참조"
            maxLength={500}
          />
        </label>
      </fieldset>
      <div className="backup-evidence-actions">
        <button type="submit" disabled={pending || demoReadOnly}>
          {pending ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <Save size={16} />
          )}
          증적 저장
        </button>
        {message ? (
          <span className={isError ? "is-error" : undefined}>{message}</span>
        ) : demoReadOnly ? (
          <span>공개 데모는 읽기 전용입니다.</span>
        ) : null}
      </div>
    </form>
  );
}

function toTimestamp(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || !value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

