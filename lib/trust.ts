export type TrustEvidenceStatus =
  | "EVIDENCE_INSUFFICIENT"
  | "EVIDENCE_LIMITED"
  | "EVIDENCE_MODERATE"
  | "EVIDENCE_SUBSTANTIAL";

export type ReviewStatus =
  | "UNREVIEWED"
  | "AUTOMATED_CHECK"
  | "ANALYST_REVIEWED"
  | "EXPERT_REVIEWED";

export type TrustScoreInput = {
  completeness: {
    availableItems: number;
    expectedItems: number;
    criticalMissing?: string[];
  };
  freshness: {
    ageDays: number;
    targetFreshnessDays: number;
  };
  crossSource: {
    matchingFields: number;
    comparedFields: number;
    independentSources: number;
    conflictingFields?: string[];
  };
  review: {
    status: ReviewStatus;
  };
};

export type TrustScoreResult = {
  score: number;
  status: TrustEvidenceStatus;
  reasons: string[];
  warnings: string[];
};

const REVIEW_RATIOS: Record<ReviewStatus, number> = {
  UNREVIEWED: 0,
  AUTOMATED_CHECK: 0.4,
  ANALYST_REVIEWED: 0.8,
  EXPERT_REVIEWED: 1,
};

const REVIEW_LABELS: Record<ReviewStatus, string> = {
  UNREVIEWED: "사람의 검토가 완료되지 않음",
  AUTOMATED_CHECK: "자동 검사를 완료함",
  ANALYST_REVIEWED: "분석가 검토를 완료함",
  EXPERT_REVIEWED: "전문가 검토를 완료함",
};

function assertNonNegativeInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative integer`);
  }
}

function assertPositiveInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${field} must be a positive integer`);
  }
}

function validateInput(input: TrustScoreInput): void {
  assertNonNegativeInteger(
    input.completeness.availableItems,
    "completeness.availableItems",
  );
  assertPositiveInteger(
    input.completeness.expectedItems,
    "completeness.expectedItems",
  );
  if (input.completeness.availableItems > input.completeness.expectedItems) {
    throw new RangeError(
      "completeness.availableItems cannot exceed completeness.expectedItems",
    );
  }

  assertNonNegativeInteger(input.freshness.ageDays, "freshness.ageDays");
  assertPositiveInteger(
    input.freshness.targetFreshnessDays,
    "freshness.targetFreshnessDays",
  );

  assertNonNegativeInteger(
    input.crossSource.matchingFields,
    "crossSource.matchingFields",
  );
  assertNonNegativeInteger(
    input.crossSource.comparedFields,
    "crossSource.comparedFields",
  );
  assertNonNegativeInteger(
    input.crossSource.independentSources,
    "crossSource.independentSources",
  );
  if (input.crossSource.matchingFields > input.crossSource.comparedFields) {
    throw new RangeError(
      "crossSource.matchingFields cannot exceed crossSource.comparedFields",
    );
  }
  if (!(input.review.status in REVIEW_RATIOS)) {
    throw new RangeError("review.status is not supported");
  }
}

function freshnessRatio(ageDays: number, targetDays: number): number {
  if (ageDays <= targetDays) return 1;
  if (ageDays <= targetDays * 2) {
    return 1 - ((ageDays - targetDays) / targetDays) * 0.4;
  }
  if (ageDays <= targetDays * 4) {
    return 0.6 - ((ageDays - targetDays * 2) / (targetDays * 2)) * 0.4;
  }
  return 0;
}

function evidenceStatus(score: number): TrustEvidenceStatus {
  if (score >= 85) return "EVIDENCE_SUBSTANTIAL";
  if (score >= 70) return "EVIDENCE_MODERATE";
  if (score >= 50) return "EVIDENCE_LIMITED";
  return "EVIDENCE_INSUFFICIENT";
}

function points(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/**
 * Calculates evidence quality only. The result does not assess investment
 * suitability, expected returns, legal validity, or transaction safety.
 */
export function calculateTrustScore(input: TrustScoreInput): TrustScoreResult {
  validateInput(input);

  const criticalMissing = input.completeness.criticalMissing ?? [];
  const conflictingFields = input.crossSource.conflictingFields ?? [];
  const completenessRatio =
    input.completeness.availableItems / input.completeness.expectedItems;
  const freshness = freshnessRatio(
    input.freshness.ageDays,
    input.freshness.targetFreshnessDays,
  );
  const fieldAgreement =
    input.crossSource.comparedFields === 0
      ? 0
      : input.crossSource.matchingFields / input.crossSource.comparedFields;
  const sourceCoverage =
    input.crossSource.independentSources >= 3
      ? 1
      : input.crossSource.independentSources === 2
        ? 0.85
        : input.crossSource.independentSources === 1
          ? 0.55
          : 0;
  const crossSourceRatio = fieldAgreement * 0.75 + sourceCoverage * 0.25;
  const reviewRatio = REVIEW_RATIOS[input.review.status];

  const completenessPoints = completenessRatio * 35;
  const freshnessPoints = freshness * 20;
  const crossSourcePoints = crossSourceRatio * 30;
  const reviewPoints = reviewRatio * 15;

  let score = Math.round(
    completenessPoints + freshnessPoints + crossSourcePoints + reviewPoints,
  );
  const reasons = [
    `자료 완전성 ${input.completeness.availableItems}/${input.completeness.expectedItems} (${points(completenessPoints)}/35점)`,
    `자료 최신성 ${input.freshness.ageDays}일 경과, 목표 ${input.freshness.targetFreshnessDays}일 (${points(freshnessPoints)}/20점)`,
    `교차출처 일치 ${input.crossSource.matchingFields}/${input.crossSource.comparedFields}, 독립 출처 ${input.crossSource.independentSources}개 (${points(crossSourcePoints)}/30점)`,
    `${REVIEW_LABELS[input.review.status]} (${points(reviewPoints)}/15점)`,
  ];
  const warnings = [
    "이 점수는 확보된 자료의 검증 수준을 나타내며 수익률, 투자 적합성, 법적 유효성 또는 거래 안전성을 보장하지 않습니다.",
  ];

  if (criticalMissing.length > 0) {
    score = Math.min(score, 59);
    warnings.push(`필수 자료 누락: ${criticalMissing.join(", ")}`);
  }
  if (input.crossSource.independentSources < 2) {
    score = Math.min(score, 69);
    warnings.push("독립 출처가 2개 미만이어서 교차 검증이 제한됩니다.");
  }
  if (conflictingFields.length > 0) {
    score = Math.min(score, 69);
    warnings.push(`출처 간 불일치: ${conflictingFields.join(", ")}`);
  }
  if (input.review.status === "UNREVIEWED") {
    score = Math.min(score, 49);
    warnings.push("사람의 검토가 완료되지 않았습니다.");
  } else if (input.review.status === "AUTOMATED_CHECK") {
    score = Math.min(score, 69);
    warnings.push("자동 검사 결과이며 사람의 검토가 필요합니다.");
  }
  if (
    input.freshness.ageDays >
    input.freshness.targetFreshnessDays * 4
  ) {
    score = Math.min(score, 59);
    warnings.push("자료가 최신성 목표의 4배를 초과해 갱신 확인이 필요합니다.");
  }

  return {
    score,
    status: evidenceStatus(score),
    reasons,
    warnings,
  };
}
