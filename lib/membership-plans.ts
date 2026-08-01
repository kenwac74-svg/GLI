export type MembershipPlanId = "explore" | "investor" | "private";
export type BillingCycle = "monthly" | "yearly";
export type IncludedAssetTier = "free" | "basic" | "standard" | "premium";

export type MembershipPlan = {
  id: MembershipPlanId;
  name: string;
  price: number;
  monthlyPriceUsd: number;
  currency: "KRW";
  annualDiscountPercent: number;
  includedAssetTier: IncludedAssetTier;
  includedAssetTierLabel: string;
  description: string;
  features: readonly string[];
  featured?: boolean;
};

export type MembershipOffer = {
  billingCycle: BillingCycle;
  amountKrw: number;
  amountUsd: number;
  periodDays: 30 | 365;
  discountPercent: number;
};

export type ConsultationPriority = "STANDARD" | "PRIORITY" | "PRIVATE";

export type MembershipEntitlements = {
  planId: MembershipPlanId | null;
  favoriteLimit: number | null;
  aiMonthlyLimit: number | null;
  consultationPriority: ConsultationPriority;
  fullTrustReport: boolean;
  includedAssetTier: IncludedAssetTier;
  includedAssetTierLevel: 1 | 2 | 3 | 4;
};

export const GUEST_ENTITLEMENTS: MembershipEntitlements = {
  planId: null,
  favoriteLimit: null,
  aiMonthlyLimit: 0,
  consultationPriority: "STANDARD",
  fullTrustReport: false,
  includedAssetTier: "free",
  includedAssetTierLevel: 1,
};

const PLAN_ENTITLEMENTS: Readonly<
  Record<MembershipPlanId, MembershipEntitlements>
> = {
  explore: {
    planId: "explore",
    favoriteLimit: null,
    aiMonthlyLimit: 60,
    consultationPriority: "STANDARD",
    fullTrustReport: false,
    includedAssetTier: "basic",
    includedAssetTierLevel: 2,
  },
  investor: {
    planId: "investor",
    favoriteLimit: null,
    aiMonthlyLimit: 150,
    consultationPriority: "PRIORITY",
    fullTrustReport: true,
    includedAssetTier: "standard",
    includedAssetTierLevel: 3,
  },
  private: {
    planId: "private",
    favoriteLimit: null,
    aiMonthlyLimit: 400,
    consultationPriority: "PRIVATE",
    fullTrustReport: true,
    includedAssetTier: "premium",
    includedAssetTierLevel: 4,
  },
};

export const MEMBERSHIP_PLANS: readonly MembershipPlan[] = [
  {
    id: "explore",
    name: "Explorer",
    price: 3_000,
    monthlyPriceUsd: 1.99,
    currency: "KRW",
    annualDiscountPercent: 10,
    includedAssetTier: "basic",
    includedAssetTierLabel: "BASIC (LV.2)",
    description: "글로벌 자산 탐색을 가볍게 시작하는 회원",
    features: [
      "BASIC 등급까지 무료 열람",
      "AI 자산 상담 월 60회",
      "관심자산 무제한 등록",
      "기본 Trust 요약",
    ],
  },
  {
    id: "investor",
    name: "Investor",
    price: 4_500,
    monthlyPriceUsd: 2.99,
    currency: "KRW",
    annualDiscountPercent: 15,
    includedAssetTier: "standard",
    includedAssetTierLabel: "STANDARD (LV.3)",
    description: "여러 국가와 자산을 비교하는 적극적 투자자",
    features: [
      "STANDARD 등급까지 무료 열람",
      "AI 자산 상담 월 150회",
      "관심자산 무제한 등록",
      "전체 Trust Report와 우선 상담",
    ],
    featured: true,
  },
  {
    id: "private",
    name: "Private",
    price: 15_000,
    monthlyPriceUsd: 10,
    currency: "KRW",
    annualDiscountPercent: 20,
    includedAssetTier: "premium",
    includedAssetTierLabel: "PREMIUM (LV.4)",
    description: "GLI 검증 자산과 현지 실행을 함께 검토하는 회원",
    features: [
      "PREMIUM 등급까지 무료 열람",
      "AI 자산 상담 월 400회",
      "관심자산 무제한 등록",
      "GLI 현지 검증·전문가 상담 우선권",
    ],
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

export function getMembershipOffer(
  planId: string,
  billingCycle: BillingCycle = "monthly",
): MembershipOffer {
  const plan = getMembershipPlan(planId);
  if (billingCycle === "monthly") {
    return {
      billingCycle,
      amountKrw: plan.price,
      amountUsd: plan.monthlyPriceUsd,
      periodDays: 30,
      discountPercent: 0,
    };
  }

  const rate = (100 - plan.annualDiscountPercent) / 100;
  return {
    billingCycle,
    amountKrw: Math.round(plan.price * 12 * rate),
    amountUsd: Math.round(plan.monthlyPriceUsd * 12 * rate * 100) / 100,
    periodDays: 365,
    discountPercent: plan.annualDiscountPercent,
  };
}

export function normalizeBillingCycle(value: unknown): BillingCycle {
  if (value === undefined || value === null || value === "") return "monthly";
  if (value !== "monthly" && value !== "yearly") {
    throw new TypeError("billingCycle must be one of: monthly, yearly");
  }
  return value;
}

export function inferBillingCycle(
  planId: string,
  amountKrw: number,
): BillingCycle {
  return amountKrw === getMembershipOffer(planId, "yearly").amountKrw
    ? "yearly"
    : "monthly";
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
