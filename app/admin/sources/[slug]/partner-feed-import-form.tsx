"use client";

import {
  FileJson2,
  FileSpreadsheet,
  LoaderCircle,
  UploadCloud,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const MAX_FEED_BYTES = 2_000_000;
const CSV_HEADERS = [
  "externalId",
  "country",
  "city",
  "district",
  "transaction",
  "propertyType",
  "price",
  "currency",
  "areaSqm",
  "bedrooms",
  "bathrooms",
  "imageUrl",
  "title",
  "summary",
  "sourceUrl",
  "observedAt",
] as const;

type FeedFormat = "json" | "csv";

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
  const [feedFormat, setFeedFormat] = useState<FeedFormat>("json");
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  function changeFormat(nextFormat: FeedFormat) {
    setFeedFormat(nextFormat);
    setFile(null);
    setMessage("");
    setIsError(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!file || pending) return;
    setMessage("");
    setIsError(false);
    setPending(true);
    try {
      if (file.size < 2 || file.size > MAX_FEED_BYTES) {
        throw new Error("2MB 이하의 파트너 피드 파일을 선택해 주세요.");
      }
      const feedText = await file.text();
      const previewCount = validatePreview(feedText, feedFormat, sourceSlug);

      if (demoReadOnly) {
        setMessage(
          previewCount === null
            ? "CSV 헤더 구조 검증 완료 · 실제 반입은 승인된 운영 계정에서 실행합니다."
            : `형식 검증 완료 · ${previewCount}건 · 실제 반입은 승인된 운영 계정에서 실행합니다.`,
        );
        return;
      }
      if (!enabled) {
        throw new Error(
          "소스 승인과 LICENSED_JSON_V1 연결을 먼저 완료해 주세요.",
        );
      }

      const response = await fetch("/api/admin/ingestion/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceSlug, feedText, feedFormat }),
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

  const FileIcon = feedFormat === "json" ? FileJson2 : FileSpreadsheet;

  return (
    <form className="partner-feed-import" onSubmit={submit}>
      <fieldset className="partner-feed-format" aria-label="파트너 피드 형식">
        <button
          type="button"
          className={feedFormat === "json" ? "is-active" : ""}
          aria-pressed={feedFormat === "json"}
          onClick={() => changeFormat("json")}
        >
          JSON
        </button>
        <button
          type="button"
          className={feedFormat === "csv" ? "is-active" : ""}
          aria-pressed={feedFormat === "csv"}
          onClick={() => changeFormat("csv")}
        >
          CSV
        </button>
      </fieldset>
      <label htmlFor={`partner-feed-${sourceSlug}-${feedFormat}`}>
        <FileIcon size={20} />
        <span>
          <strong>
            {file?.name ?? `GLI 파트너 ${feedFormat.toUpperCase()} 파일 선택`}
          </strong>
          <small>
            {feedFormat === "json"
              ? "gli.partner-listings.v1 · 최대 2MB"
              : "GLI 표준 열 · UTF-8 CSV · 최대 2MB"}
          </small>
        </span>
      </label>
      <input
        key={feedFormat}
        id={`partner-feed-${sourceSlug}-${feedFormat}`}
        type="file"
        accept={
          feedFormat === "json"
            ? "application/json,.json"
            : "text/csv,.csv"
        }
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

function validatePreview(
  feedText: string,
  feedFormat: FeedFormat,
  sourceSlug: string,
): number | null {
  if (feedFormat === "json") {
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
      throw new Error(
        "GLI 파트너 피드 형식과 소스 식별자를 확인해 주세요.",
      );
    }
    return envelope.listings.length;
  }

  const firstLine = feedText.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0];
  const headers = firstLine.split(",");
  if (
    headers.length !== CSV_HEADERS.length ||
    CSV_HEADERS.some((header) => !headers.includes(header))
  ) {
    throw new Error("GLI 표준 CSV 헤더를 확인해 주세요.");
  }
  return null;
}
