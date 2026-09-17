"use client";

import {
  Bot,
  CheckCircle2,
  CircleX,
  LoaderCircle,
  Play,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AiEvaluationRun } from "../../../db/ai-evaluation-runs.ts";
import type {
  AiEvaluationCaseResult,
  AiEvaluationMode,
} from "../../../lib/ai-evaluation.ts";

type EvaluationView = Pick<
  AiEvaluationRun,
  | "suiteVersion"
  | "requestedMode"
  | "model"
  | "status"
  | "passedCount"
  | "totalCount"
  | "completedAt"
  | "cases"
>;

export function AiEvaluationPanel({
  latest,
  demoReadOnly,
  aiConfigured,
}: {
  latest: EvaluationView | null;
  demoReadOnly: boolean;
  aiConfigured: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<AiEvaluationMode | null>(null);
  const [result, setResult] = useState<EvaluationView | null>(latest);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function run(mode: AiEvaluationMode) {
    setPending(mode);
    setMessage("");
    setIsError(false);
    try {
      const response = await fetch("/api/admin/readiness/ai-evaluation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const payload = (await response.json()) as {
        result?: EvaluationView;
        persisted?: boolean;
        error?: string;
      };
      if (!response.ok || !payload.result) {
        throw new Error(payload.error ?? "AI 검색 평가를 실행하지 못했습니다.");
      }
      setResult(payload.result);
      setMessage(
        payload.persisted
          ? "실제 모델 평가 증적을 저장했습니다."
          : "공개 데모 규칙 모드 리허설을 완료했습니다. 결과는 저장되지 않습니다.",
      );
      if (payload.persisted) router.refresh();
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "AI 검색 평가를 실행하지 못했습니다.",
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="readiness-section ai-evaluation-section">
      <div className="ops-section-head">
        <div>
          <p className="section-kicker">AI QUALITY EVIDENCE</p>
          <h2>상담형 검색 품질 평가</h2>
        </div>
        <Bot size={23} />
      </div>
      <p className="ai-evaluation-intro">
        대표 투자 질문 5종으로 조건 해석, 후보 접지, Trust 값 불변과 안전
        폴백을 함께 확인합니다.
      </p>

      <div className="ai-evaluation-actions">
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => run("rules")}
        >
          {pending === "rules" ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <Play size={16} />
          )}
          규칙 모드 리허설
        </button>
        <button
          type="button"
          disabled={pending !== null || demoReadOnly || !aiConfigured}
          onClick={() => run("openai")}
        >
          {pending === "openai" ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <Bot size={16} />
          )}
          실제 AI 평가
        </button>
        <span>
          {demoReadOnly
            ? "공개 데모는 비용 없는 규칙 모드만 실행합니다."
            : aiConfigured
              ? "실제 AI 평가는 성공·실패 모두 운영 증거로 기록됩니다."
              : "서버 AI 설정 후 실제 모델 평가가 활성화됩니다."}
        </span>
      </div>

      {message ? (
        <p className={isError ? "ai-evaluation-message is-error" : "ai-evaluation-message"}>
          {message}
        </p>
      ) : null}

      {result ? (
        <div className="ai-evaluation-result">
          <div className="ai-evaluation-summary">
            <div>
              <span>{result.requestedMode.toUpperCase()}</span>
              <strong>
                {result.passedCount}/{result.totalCount}
              </strong>
            </div>
            <div>
              <span>{result.suiteVersion}</span>
              <strong>{result.status}</strong>
            </div>
            <div>
              <span>평가 시각</span>
              <strong>{formatDate(result.completedAt)}</strong>
            </div>
          </div>
          <div className="ai-evaluation-cases">
            {result.cases.map((scenario) => (
              <EvaluationCase key={scenario.id} scenario={scenario} />
            ))}
          </div>
        </div>
      ) : (
        <p className="readiness-empty">아직 실행된 AI 검색 품질 평가가 없습니다.</p>
      )}
    </section>
  );
}

function EvaluationCase({
  scenario,
}: {
  scenario: AiEvaluationCaseResult;
}) {
  const failures = scenario.checks.filter((check) => !check.passed);
  return (
    <article className={scenario.status === "PASS" ? "status-pass" : "status-fail"}>
      {scenario.status === "PASS" ? (
        <CheckCircle2 size={18} />
      ) : (
        <CircleX size={18} />
      )}
      <div>
        <strong>{scenario.label}</strong>
        <span>
          {scenario.advisorMode.toUpperCase()} · 후보 {scenario.matchCount}건
        </span>
        {failures.length ? (
          <small>{failures.map((check) => check.detail).join(" · ")}</small>
        ) : null}
      </div>
      <em>{scenario.status}</em>
    </article>
  );
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Phnom_Penh",
  }).format(new Date(timestamp));
}
