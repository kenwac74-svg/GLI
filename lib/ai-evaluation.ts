import type { Asset } from "./assets.ts";
import { runAdvisorSearch } from "./ai-search.ts";
import type { SearchCriteria } from "./search.ts";

export const AI_EVALUATION_SUITE_VERSION = "gli.ai-search.eval.v1";

export type AiEvaluationMode = "rules" | "openai";
export type AiEvaluationStatus = "SUCCEEDED" | "FAILED";

export type AiEvaluationCaseResult = {
  id: string;
  label: string;
  status: "PASS" | "FAIL";
  advisorMode: AiEvaluationMode;
  matchCount: number;
  checks: Array<{
    id: "criteria" | "matches" | "grounding" | "trust" | "provider";
    passed: boolean;
    detail: string;
  }>;
};

export type AiSearchEvaluation = {
  suiteVersion: string;
  requestedMode: AiEvaluationMode;
  model: string | null;
  status: AiEvaluationStatus;
  passedCount: number;
  totalCount: number;
  startedAt: number;
  completedAt: number;
  cases: AiEvaluationCaseResult[];
};

type EvaluationOptions = {
  mode?: AiEvaluationMode;
  apiKey?: string;
  model?: string;
  fetch?: typeof fetch;
  now?: () => number;
};

type EvaluationCase = {
  id: string;
  label: string;
  query: string;
  context?: SearchCriteria;
  expectedCriteria: Partial<SearchCriteria>;
  minimumMatches: number;
};

const EVALUATION_CASES: readonly EvaluationCase[] = [
  {
    id: "income-krw-budget",
    label: "5천만원 임대수익 투자 상담",
    query:
      "캄보디아 프놈펜에 5000만원 정도로 월세 잘 나오는 투자를 할 수 있을까?",
    expectedCriteria: {
      transaction: "sale",
      purpose: "income",
      budgetKrw: 50_000_000,
      maxPriceUsd: 36_232,
    },
    minimumMatches: 1,
  },
  {
    id: "seasonal-short-stay",
    label: "계절 체류와 부재 중 단기임대",
    query:
      "겨울마다 3개월 정도 편하게 쉴 별장 겸, 내가 없을 때는 에어비앤비를 굴릴 곳이 있니?",
    expectedCriteria: {
      transaction: "sale",
      purpose: "seasonal",
      wantsShortStay: true,
    },
    minimumMatches: 1,
  },
  {
    id: "bkk1-rental",
    label: "BKK1 예산형 장기 임대",
    query: "BKK1에서 월 700달러 이하 1베드 콘도 임대를 찾아줘",
    expectedCriteria: {
      district: "BKK1",
      transaction: "rent",
      propertyType: "condo",
      bedrooms: 1,
      maxPriceUsd: 700,
    },
    minimumMatches: 1,
  },
  {
    id: "river-two-bedroom",
    label: "메콩강 전망 2베드 임대",
    query: "메콩강 전망 2베드 월 500달러 임대를 찾아줘",
    expectedCriteria: {
      transaction: "rent",
      bedrooms: 2,
      maxPriceUsd: 500,
      wantsRiver: true,
    },
    minimumMatches: 1,
  },
  {
    id: "bounded-follow-up",
    label: "이전 조건을 유지하는 후속 질문",
    query: "그중 2베드고 강 전망이면 좋겠어",
    context: {
      country: "Cambodia",
      city: "Phnom Penh",
      district: null,
      transaction: "rent",
      propertyType: "condo",
      maxPriceUsd: 500,
      budgetKrw: null,
      bedrooms: null,
      purpose: "residence",
      wantsShortStay: false,
      wantsRiver: false,
    },
    expectedCriteria: {
      transaction: "rent",
      propertyType: "condo",
      bedrooms: 2,
      maxPriceUsd: 500,
      purpose: "residence",
      wantsRiver: true,
    },
    minimumMatches: 1,
  },
];

export async function runAiSearchEvaluation(
  assets: Asset[],
  options: EvaluationOptions = {},
): Promise<AiSearchEvaluation> {
  if (!Array.isArray(assets) || assets.length === 0) {
    throw new RangeError("AI evaluation requires at least one published asset");
  }
  const mode = options.mode ?? "rules";
  if (mode === "openai" && !options.apiKey) {
    throw new TypeError("OpenAI evaluation requires a server API key");
  }
  const now = options.now ?? Date.now;
  const startedAt = now();
  const sourceById = new Map(assets.map((asset) => [asset.id, asset]));
  const cases: AiEvaluationCaseResult[] = [];

  for (const scenario of EVALUATION_CASES) {
    const result = await runAdvisorSearch(scenario.query, assets, {
      provider: mode === "openai" ? "openai" : "disabled",
      apiKey: options.apiKey,
      model: options.model,
      fetch: options.fetch,
      context: scenario.context ?? null,
      timeoutMs: 12_000,
    });
    const criteriaPassed = Object.entries(scenario.expectedCriteria).every(
      ([key, value]) => result.criteria[key as keyof SearchCriteria] === value,
    );
    const matchesPassed = result.matches.length >= scenario.minimumMatches;
    const grounded =
      result.matches.every((asset) => sourceById.has(asset.id)) &&
      result.citations.length === result.matches.length &&
      result.citations.every(
        (citation, index) => citation.assetId === result.matches[index]?.id,
      ) &&
      result.advisor.groundedAssetIds.every((id) => sourceById.has(id));
    const trustImmutable = result.matches.every((asset) => {
      const source = sourceById.get(asset.id);
      return (
        source?.trustScore === asset.trustScore &&
        source.trustStatus === asset.trustStatus
      );
    });
    const providerPassed =
      mode === "rules"
        ? result.advisor.mode === "rules"
        : result.matches.length === 0 || result.advisor.mode === "openai";
    const checks: AiEvaluationCaseResult["checks"] = [
      {
        id: "criteria",
        passed: criteriaPassed,
        detail: criteriaPassed
          ? "의도와 조건을 기준값대로 해석"
          : "일부 검색 조건이 기준값과 다름",
      },
      {
        id: "matches",
        passed: matchesPassed,
        detail: `후보 ${result.matches.length}건`,
      },
      {
        id: "grounding",
        passed: grounded,
        detail: grounded
          ? "서버 제공 후보와 인용만 사용"
          : "허용되지 않은 후보 또는 인용 감지",
      },
      {
        id: "trust",
        passed: trustImmutable,
        detail: trustImmutable
          ? "Trust 값 불변"
          : "Trust 값 변경 감지",
      },
      {
        id: "provider",
        passed: providerPassed,
        detail:
          result.advisor.mode === "openai"
            ? `OpenAI · ${result.advisor.model ?? "model"}`
            : "검증 규칙 폴백",
      },
    ];
    cases.push({
      id: scenario.id,
      label: scenario.label,
      status: checks.every((check) => check.passed) ? "PASS" : "FAIL",
      advisorMode: result.advisor.mode,
      matchCount: result.matches.length,
      checks,
    });
  }

  const passedCount = cases.filter((scenario) => scenario.status === "PASS").length;
  return {
    suiteVersion: AI_EVALUATION_SUITE_VERSION,
    requestedMode: mode,
    model: mode === "openai" ? options.model ?? null : null,
    status: passedCount === cases.length ? "SUCCEEDED" : "FAILED",
    passedCount,
    totalCount: cases.length,
    startedAt,
    completedAt: now(),
    cases,
  };
}
