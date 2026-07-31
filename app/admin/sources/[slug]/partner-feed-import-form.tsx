"use client";

import { FileJson2, LoaderCircle, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const MAX_FEED_BYTES = 2_000_000;

export function PartnerFeedImportForm({
  sourceSlug,
  enabled,
  demoReadOnly,
}: {
  sourceSlug: string;
  enabled: boolean;
  demoReadOnly: boolean;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!file || pending) return;
    setMessage("");
    setIsError(false);
    setPending(true);
    try {
      if (file.size < 2 || file.size > MAX_FEED_BYTES) {
        throw new Error("2MB 이하의 JSON 파일을 선택해 주세요.");
      }
      const feedText = await file.text();
      const envelope = JSON.parse(feedText) as {
        schemaVersion?: unknown;
        sourceSlug?: unknown;
        listings?: unknown;
      };
      if (
        envelope.schemaVersion !== "gli.partner-listings.v1" ||
        envelope.sourceSlug !== sourceSlug ||
        !Array.isArray(envelope.listings) ||
        envelope.listings.length === 0
      ) {
        throw new Error("GLI 파트너 피드 형식과 소스 식별자를 확인해 주세요.");
      }

      if (demoReadOnly) {
        setMessage(
          `형식 검증 완료 · ${envelope.listings.length}건 · 실제 반입은 승인된 운영 계정에서 실행됩니다.`,
        );
        return;
      }
      if (!enabled) {
        throw new Error("소스 승인과 LICENSED_JSON_V1 연결을 먼저 완료해 주세요.");
      }

      const response = await fetch("/api/admin/ingestion/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceSlug, feedText }),
      });
      const payload = (await response.json()) as {
        result?: {
          acceptedCount: number;
          rejectedCount: number;
          status: string;
        };
        error?: string;
      };
      if (!response.ok || !payload.result) {
        throw new Error(payload.error ?? "파트너 자료를 반입할 수 없습니다.");
      }
      setMessage(
        `${payload.result.acceptedCount}건 반영 · ${payload.result.rejectedCount}건 제외 · ${payload.result.status}`,
      );
      setFile(null);
      form.reset();
      router.refresh();
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "파트너 자료를 반입할 수 없습니다.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="partner-feed-import" onSubmit={submit}>
      <label htmlFor={`partner-feed-${sourceSlug}`}>
        <FileJson2 size={20} />
        <span>
          <strong>{file?.name ?? "GLI 파트너 JSON 파일 선택"}</strong>
          <small>gli.partner-listings.v1 · 최대 2MB</small>
        </span>
      </label>
      <input
        id={`partner-feed-${sourceSlug}`}
        type="file"
        accept="application/json,.json"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
      />
      <button
        type="submit"
        disabled={pending || !file || (!enabled && !demoReadOnly)}
      >
        {pending ? (
          <LoaderCircle className="spin" size={17} />
        ) : (
          <UploadCloud size={17} />
        )}
        {demoReadOnly ? "파일 구조 검증" : "검토 대기로 반입"}
      </button>
      {message ? (
        <p className={isError ? "is-error" : ""} aria-live="polite">
          {message}
        </p>
      ) : null}
    </form>
  );
}
