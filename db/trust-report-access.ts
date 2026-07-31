import { canAccessFullTrustReport } from "../lib/membership-plans.ts";
import type { D1DatabaseLike } from "./user-workflows.ts";

const RECENT_EVIDENCE_MS = 30 * 24 * 60 * 60 * 1000;

export type TrustEvidenceStatus =
  | "CONFIRMED"
  | "SUPPORTED"
  | "CURRENT"
  | "LIMITED"
  | "IN_REVIEW"
  | "PENDING";

export type FullTrustReport = {
  reportId: string;
  listingPublicId: string;
  listingTitle: string;
  score: number;
  trustStatus: string;
  ruleVersion: string;
  calculatedAt: number;
  lastObservedAt: number;
  sourceCount: number;
  humanApproved: boolean;
  approvedAt: number | null;
  reviewerName: string | null;
  explanation: string;
  evidence: Array<{
    key: string;
    label: string;
    status: TrustEvidenceStatus;
    detail: string;
  }>;
};

export type TrustReportAccess =
  | {
      granted: false;
      reason: "MEMBERSHIP_REQUIRED" | "PLAN_UPGRADE_REQUIRED";
      membershipPlanId: string | null;
      report: null;
    }
  | {
      granted: true;
      reason: null;
      membershipPlanId: string;
      report: FullTrustReport;
    };

type MembershipRow = {
  planId: string;
};

type ReportRow = {
  publicId: string;
  title: string;
  isGliDirect: number | boolean;
  trustRunId: number;
  score: number;
  trustStatus: string;
  ruleVersion: string;
  explanation: string;
  calculatedAt: number;
  approvedAt: number | null;
  reviewerName: string | null;
  sourceCount: number;
  lastObservedAt: number;
};

export async function getTrustReportForMember(
  database: D1DatabaseLike,
  userId: string,
  listingPublicId: string,
  options: { now?: number } = {},
): Promise<TrustReportAccess> {
  assertDatabase(database);
  const normalizedUserId = validateId(userId, "userId");
  const normalizedPublicId = validateId(listingPublicId, "listingPublicId");
  const now = validateNow(options.now);

  const user = await database
    .prepare("SELECT status FROM users WHERE id = ? LIMIT 1")
    .bind(normalizedUserId)
    .first<{ status: string }>();
  if (!user) throw new Error("User was not found");
  if (user.status !== "ACTIVE") throw new Error("User is not active");

  const membership = await database
    .prepare(
      `SELECT plan_id AS planId
       FROM memberships
       WHERE user_id = ? AND status = 'ACTIVE' AND period_end > ?
       ORDER BY period_end DESC, created_at DESC
       LIMIT 1`,
    )
    .bind(normalizedUserId, now)
    .first<MembershipRow>();

  if (!membership) {
    return {
      granted: false,
      reason: "MEMBERSHIP_REQUIRED",
      membershipPlanId: null,
      report: null,
    };
  }
  if (!canAccessFullTrustReport(membership.planId)) {
    return {
      granted: false,
      reason: "PLAN_UPGRADE_REQUIRED",
      membershipPlanId: membership.planId,
      report: null,
    };
  }

  const row = await database
    .prepare(
      `SELECT
         listings.public_id AS publicId,
         listings.title,
         listings.is_gli_direct AS isGliDirect,
         trust_score_runs.id AS trustRunId,
         trust_score_runs.score,
         trust_score_runs.status AS trustStatus,
         trust_score_runs.rule_version AS ruleVersion,
         trust_score_runs.explanation,
         trust_score_runs.calculated_at AS calculatedAt,
         trust_score_runs.approved_at AS approvedAt,
         reviewers.display_name AS reviewerName,
         (
           SELECT COUNT(DISTINCT listing_sources.source_id)
           FROM listing_sources
           WHERE listing_sources.listing_id = listings.id
         ) AS sourceCount,
         COALESCE(
           (
             SELECT MAX(listing_versions.observed_at)
             FROM listing_versions
             WHERE listing_versions.listing_id = listings.id
           ),
           listings.updated_at
         ) AS lastObservedAt
       FROM listings
       INNER JOIN trust_score_runs
         ON trust_score_runs.id = (
           SELECT inner_runs.id
           FROM trust_score_runs inner_runs
           WHERE inner_runs.listing_id = listings.id
           ORDER BY inner_runs.calculated_at DESC, inner_runs.id DESC
           LIMIT 1
         )
       LEFT JOIN users reviewers
         ON reviewers.id = trust_score_runs.approved_by_user_id
       WHERE listings.public_id = ? AND listings.status = 'ACTIVE'
       LIMIT 1`,
    )
    .bind(normalizedPublicId)
    .first<ReportRow>();
  if (!row) {
    throw new Error(`Trust Report for ${normalizedPublicId} was not found`);
  }

  const sourceCount = Number(row.sourceCount);
  const lastObservedAt = Number(row.lastObservedAt);
  const humanApproved = row.approvedAt !== null;
  const isRecent =
    lastObservedAt <= now && now - lastObservedAt <= RECENT_EVIDENCE_MS;
  const isGliDirect =
    row.isGliDirect === true || Number(row.isGliDirect) === 1;

  return {
    granted: true,
    reason: null,
    membershipPlanId: membership.planId,
    report: {
      reportId: `${row.publicId}-${row.ruleVersion}-${row.trustRunId}`,
      listingPublicId: row.publicId,
      listingTitle: row.title,
      score: Number(row.score),
      trustStatus: row.trustStatus,
      ruleVersion: row.ruleVersion,
      calculatedAt: Number(row.calculatedAt),
      lastObservedAt,
      sourceCount,
      humanApproved,
      approvedAt: row.approvedAt === null ? null : Number(row.approvedAt),
      reviewerName: row.reviewerName,
      explanation: row.explanation,
      evidence: [
        {
          key: "listing-profile",
          label: "매물 기본 정보",
          status: "CONFIRMED",
          detail: "가격, 면적, 위치, 거래 유형이 공통 형식으로 정규화되었습니다.",
        },
        {
          key: "cross-source",
          label: "교차 출처",
          status: sourceCount >= 2 ? "SUPPORTED" : "LIMITED",
          detail:
            sourceCount >= 2
              ? `독립 출처 ${sourceCount}곳의 연결 기록이 있습니다.`
              : "현재 연결된 독립 출처가 1곳이어서 추가 교차 확인이 필요합니다.",
        },
        {
          key: "freshness",
          label: "자료 최신성",
          status: isRecent ? "CURRENT" : "LIMITED",
          detail: isRecent
            ? "최근 30일 이내 관측 자료를 사용했습니다."
            : "최근 관측 후 30일이 지나 가격과 상태를 다시 확인해야 합니다.",
        },
        {
          key: "human-review",
          label: "GLI 분석가 검토",
          status: humanApproved ? "SUPPORTED" : "IN_REVIEW",
          detail: humanApproved
            ? "GLI 분석가가 이 Trust 실행을 승인했습니다."
            : "자동 평가가 완료됐으며 사람의 최종 승인은 아직 진행 중입니다.",
        },
        {
          key: "legal-evidence",
          label: "권리·법률 자료",
          status: "PENDING",
          detail: "등기, 소유권과 계약 조건은 별도 현지 전문가 확인 대상입니다.",
        },
        {
          key: "field-evidence",
          label: "현장 확인",
          status: "PENDING",
          detail: isGliDirect
            ? "GLI Direct 현장 확인 프로그램을 상담으로 신청할 수 있습니다."
            : "GLI가 직접 확인한 현장 기록은 아직 없습니다.",
        },
      ],
    },
  };
}

function validateId(value: string, field: string): string {
  if (
    typeof value !== "string" ||
    value.trim().length < 1 ||
    value.trim().length > 128 ||
    !/^[A-Za-z0-9._:-]+$/.test(value.trim())
  ) {
    throw new TypeError(`${field} is invalid`);
  }
  return value.trim();
}

function validateNow(value: number | undefined): number {
  const now = value ?? Date.now();
  if (!Number.isSafeInteger(now) || now <= 0) {
    throw new TypeError("now must be a positive integer timestamp");
  }
  return now;
}

function assertDatabase(
  database: D1DatabaseLike,
): asserts database is D1DatabaseLike {
  if (!database || typeof database.prepare !== "function") {
    throw new TypeError("A D1 database binding is required");
  }
}

