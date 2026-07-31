export type MembershipPlan = {
  id: "explore" | "investor" | "private";
  name: string;
  price: number;
  currency: "KRW";
  description: string;
  features: readonly string[];
  featured?: boolean;
};

export const MEMBERSHIP_PLANS: readonly MembershipPlan[] = [
  {
    id: "explore",
    name: "Explore",
    price: 29_000,
    currency: "KRW",
    description: "해외 부동산 탐색을 시작하는 개인",
    features: ["AI 검색 확장", "관심 자산 20개", "기본 Trust 요약", "월간 알림"],
  },
  {
    id: "investor",
    name: "Investor",
    price: 59_000,
    currency: "KRW",
    description: "여러 자산을 비교하는 적극적 투자자",
    features: ["무제한 AI 검색", "자산 비교", "전체 Trust Report", "우선 상담 접수"],
    featured: true,
  },
  {
    id: "private",
    name: "Private",
    price: 99_000,
    currency: "KRW",
    description: "GLI Direct와 현지 실행을 함께 검토",
    features: ["Investor 전체 기능", "GLI Direct 브리핑", "전문가 상담", "현장 프로그램 우선 예약"],
  },
] as const;

export function getMembershipPlan(value: string): MembershipPlan {
  const planId = value.trim().toLowerCase();
  const plan = MEMBERSHIP_PLANS.find((candidate) => candidate.id === planId);
  if (!plan) {
    throw new TypeError("planId must be one of: explore, investor, private");
  }
  return plan;
}

export function canAccessFullTrustReport(planId: string): boolean {
  return planId === "investor" || planId === "private";
}

