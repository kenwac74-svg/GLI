import {
  getMembershipEntitlements,
  type MembershipEntitlements,
} from "../lib/membership-plans.ts";
import type { D1DatabaseLike } from "./user-workflows.ts";

const AI_SEARCH_METRIC = "AI_SEARCH";

type ActiveMembershipRow = {
  planId: string;
};

type CountRow = {
  count: number;
};

export type MembershipAccess = MembershipEntitlements & {
  aiUsed: number;
  aiRemaining: number | null;
  periodKey: string;
};

export class MembershipLimitError extends Error {
  readonly code: "FAVORITE_LIMIT_REACHED" | "AI_LIMIT_REACHED";
  readonly status: 403;

  constructor(
    code: "FAVORITE_LIMIT_REACHED" | "AI_LIMIT_REACHED",
    message: string,
  ) {
    super(message);
    this.name = "MembershipLimitError";
    this.code = code;
    this.status = 403;
  }
}

export async function getMembershipAccess(
  database: D1DatabaseLike,
  userId: string,
  now = Date.now(),
): Promise<MembershipAccess> {
  const membership = await database
    .prepare(`
      SELECT plan_id AS planId
      FROM memberships
      WHERE user_id = ? AND status = 'ACTIVE' AND period_end > ?
      ORDER BY period_end DESC, created_at DESC
      LIMIT 1
    `)
    .bind(userId, now)
    .first<ActiveMembershipRow>();
  const entitlements = getMembershipEntitlements(membership?.planId);
  const periodKey = toPeriodKey(now);
  const aiUsed = await getAiUsage(database, userId, periodKey);

  return {
    ...entitlements,
    aiUsed,
    aiRemaining:
      entitlements.aiMonthlyLimit === null
        ? null
        : Math.max(0, entitlements.aiMonthlyLimit - aiUsed),
    periodKey,
  };
}

export async function assertFavoriteCapacity(
  database: D1DatabaseLike,
  userId: string,
  now = Date.now(),
): Promise<MembershipAccess> {
  const access = await getMembershipAccess(database, userId, now);
  if (access.favoriteLimit === null) return access;

  const row = await database
    .prepare(`
      SELECT count(*) AS count
      FROM favorites
      WHERE user_id = ?
    `)
    .bind(userId)
    .first<CountRow>();
  if ((row?.count ?? 0) >= access.favoriteLimit) {
    throw new MembershipLimitError(
      "FAVORITE_LIMIT_REACHED",
      `현재 플랜의 관심 자산 한도 ${access.favoriteLimit}개에 도달했습니다.`,
    );
  }
  return access;
}

export async function claimAiSearch(
  database: D1DatabaseLike,
  userId: string,
  now = Date.now(),
): Promise<MembershipAccess> {
  const access = await getMembershipAccess(database, userId, now);
  const limit = access.aiMonthlyLimit;
  if (limit === 0) {
    throw new MembershipLimitError(
      "AI_LIMIT_REACHED",
      "심화 AI 검색은 Explore 이상 멤버십에서 이용할 수 있습니다.",
    );
  }
  if (limit === null) return access;

  const result = await database
    .prepare(`
      INSERT INTO membership_usage_counters (
        user_id, period_key, metric, used_count, updated_at
      ) VALUES (?, ?, ?, 1, ?)
      ON CONFLICT(user_id, period_key, metric) DO UPDATE SET
        used_count = membership_usage_counters.used_count + 1,
        updated_at = excluded.updated_at
      WHERE membership_usage_counters.used_count < ?
    `)
    .bind(userId, access.periodKey, AI_SEARCH_METRIC, now, limit)
    .run();

  if ((result.meta?.changes ?? 0) < 1) {
    throw new MembershipLimitError(
      "AI_LIMIT_REACHED",
      `이번 달 심화 AI 검색 ${limit}회를 모두 사용했습니다.`,
    );
  }
  return {
    ...access,
    aiUsed: access.aiUsed + 1,
    aiRemaining: Math.max(0, limit - access.aiUsed - 1),
  };
}

export async function releaseAiSearch(
  database: D1DatabaseLike,
  userId: string,
  periodKey: string,
  now = Date.now(),
): Promise<void> {
  await database
    .prepare(`
      UPDATE membership_usage_counters
      SET used_count = max(0, used_count - 1), updated_at = ?
      WHERE user_id = ? AND period_key = ? AND metric = ?
    `)
    .bind(now, userId, periodKey, AI_SEARCH_METRIC)
    .run();
}

function toPeriodKey(now: number): string {
  return new Date(now).toISOString().slice(0, 7);
}

async function getAiUsage(
  database: D1DatabaseLike,
  userId: string,
  periodKey: string,
): Promise<number> {
  const row = await database
    .prepare(`
      SELECT used_count AS count
      FROM membership_usage_counters
      WHERE user_id = ? AND period_key = ? AND metric = ?
      LIMIT 1
    `)
    .bind(userId, periodKey, AI_SEARCH_METRIC)
    .first<CountRow>();
  return row?.count ?? 0;
}
