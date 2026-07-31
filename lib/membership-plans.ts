export type MembershipPlan = {
  id: "explore" | "investor" | "private";
  name: string;
  price: number;
  currency: "KRW";
  description: string;
  features: readonly string[];
  featured?: boolean;
};

export type ConsultationPriority = "STANDARD" | "PRIORITY" | "PRIVATE";

export type MembershipEntitlements = {
  planId: MembershipPlan["id"] | null;
  favoriteLimit: number | null;
  aiMonthlyLimit: number | null;
  consultationPriority: ConsultationPriority;
  fullTrustReport: boolean;
};

export const GUEST_ENTITLEMENTS: MembershipEntitlements = {
  planId: null,
  favoriteLimit: 5,
  aiMonthlyLimit: 0,
  consultationPriority: "STANDARD",
  fullTrustReport: false,
};

const PLAN_ENTITLEMENTS: Readonly<
  Record<MembershipPlan["id"], MembershipEntitlements>
> = {
  explore: {
    planId: "explore",
    favoriteLimit: 20,
    aiMonthlyLimit: 60,
    consultationPriority: "STANDARD",
    fullTrustReport: false,
  },
  investor: {
    planId: "investor",
    favoriteLimit: null,
    aiMonthlyLimit: null,
    consultationPriority: "PRIORITY",
    fullTrustReport: true,
  },
  private: {
    planId: "private",
    favoriteLimit: null,
    aiMonthlyLimit: null,
    consultationPriority: "PRIVATE",
    fullTrustReport: true,
  },
};

export const MEMBERSHIP_PLANS: readonly MembershipPlan[] = [
  {
    id: "explore",
    name: "Explore",
    price: 29_000,
    currency: "KRW",
    description: "해외 부동산 탐색을 시작하는 개인",
    features: [
      "심화 AI 검색 월 60회",
      "관심 자산 20개",
      "기본 Trust 요약",
      "월간 알림",
    ],
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
  return getMembershipEntitlements(planId).fullTrustReport;
}

export function getMembershipEntitlements(
  planId: string | null | undefined,
): MembershipEntitlements {
  if (!planId) return GUEST_ENTITLEMENTS;
  const normalized = planId.trim().toLowerCase();
  if (
    normalized !== "explore" &&
    normalized !== "investor" &&
    normalized !== "private"
  ) {
    return GUEST_ENTITLEMENTS;
  }
  return PLAN_ENTITLEMENTS[normalized];
}
