export type GliAiDepth = "quick" | "guided" | "deep";

export type GliAiPublicStage = {
  id: "intent" | "discovery" | "review" | "synthesis";
  label: string;
  description: string;
};

export type GliAiPublicPlan = {
  version: "gli.ai.orchestration.v1";
  depth: GliAiDepth;
  summary: string;
  stages: GliAiPublicStage[];
};

type PlanningOptions = {
  hasConversationContext?: boolean;
};

const INVESTMENT_ANALYSIS_PATTERN =
  /투자|수익|수익률|월세|임대료|순수익|현금흐름|예산|세금|취득|공실|위험|리스크|소유권|계약|추천|비교|가능할까|어떻게|investment|yield|income|tax|risk|compare/i;

const DEEP_ANALYSIS_PATTERN =
  /순수익|수익률|현금흐름|세금|취득비용|소유권|계약서|법률|위험|리스크|검증|분석|투자금|목표 수익|net yield|cash flow|due diligence/i;

/**
 * Public orchestration metadata intentionally excludes provider names. The live
 * implementation can assign separate scout, analyst and advisor connectors on
 * the server without changing the client contract or exposing vendors.
 */
export function planGliAiRequest(
  query: string,
  options: PlanningOptions = {},
): GliAiPublicPlan {
  const clean = query.trim();
  const hasContext = options.hasConversationContext === true;
  const isDeep =
    DEEP_ANALYSIS_PATTERN.test(clean) ||
    (INVESTMENT_ANALYSIS_PATTERN.test(clean) && clean.length >= 45) ||
    (hasContext && clean.length >= 24);
  const isGuided = isDeep || hasContext || INVESTMENT_ANALYSIS_PATTERN.test(clean);
  const depth: GliAiDepth = isDeep ? "deep" : isGuided ? "guided" : "quick";

  const stages: GliAiPublicStage[] = [
    {
      id: "intent",
      label: "요청 이해",
      description: "국가, 예산과 투자 목적을 정리합니다.",
    },
    {
      id: "discovery",
      label: "후보 탐색",
      description: "GLI 보유 자료와 공개 매물을 함께 확인합니다.",
    },
  ];

  if (depth !== "quick") {
    stages.push({
      id: "review",
      label: "근거 검토",
      description: "가격, 수익 조건과 추가 확인 사항을 대조합니다.",
    });
  }

  stages.push({
    id: "synthesis",
    label: "답변 구성",
    description:
      depth === "deep"
        ? "가능성과 위험, 다음 행동을 하나의 답변으로 정리합니다."
        : "조건에 맞는 결과를 이해하기 쉽게 정리합니다.",
  });

  return {
    version: "gli.ai.orchestration.v1",
    depth,
    summary:
      depth === "deep"
        ? "투자 조건과 시장 근거를 함께 검토한 심화 답변입니다."
        : depth === "guided"
          ? "요청 조건과 후보 근거를 함께 검토했습니다."
          : "요청 조건에 맞는 후보를 빠르게 확인했습니다.",
    stages,
  };
}
