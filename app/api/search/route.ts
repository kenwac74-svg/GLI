import { NextResponse } from "next/server";
import {
  claimAiSearch,
  getMembershipAccess,
  releaseAiSearch,
  type MembershipAccess,
} from "../../../db/membership-entitlements.ts";
import { listAssets } from "../../../lib/assets-data";
import {
  createSafetyIdentifier,
  runAdvisorSearch,
} from "../../../lib/ai-search";
import { extractCriteria, parseSearchContext } from "../../../lib/search";
import { getCurrentUser } from "../../auth";
import { ensureMemberContext } from "../../../lib/member-data";
import { listCuratedOpportunities } from "../../../lib/curated-opportunities";
import { discoverCambodiaAssets } from "../../../lib/cambodia-live-discovery";
import { planGliAiRequest } from "../../../lib/gli-ai-orchestration";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "요청 형식을 확인해 주세요." } },
      { status: 400 },
    );
  }

  const query =
    typeof body === "object" &&
    body !== null &&
    "query" in body &&
    typeof body.query === "string"
      ? body.query.trim()
      : "";

  if (!query || query.length > 800) {
    return NextResponse.json(
      { error: { code: "INVALID_QUERY", message: "1자 이상 800자 이하로 입력해 주세요." } },
      { status: 400 },
    );
  }

  const contextValue =
    typeof body === "object" && body !== null && "context" in body
      ? body.context
      : undefined;
  const context =
    contextValue === undefined ? null : parseSearchContext(contextValue);
  if (contextValue !== undefined && context === null) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_SEARCH_CONTEXT",
          message: "이전 검색 조건을 확인해 주세요.",
        },
      },
      { status: 400 },
    );
  }

  const source = await listAssets({ limit: 100 });
  const requestedCriteria = extractCriteria(query, context);
  const liveDiscoveryEnabled =
    process.env.LIVE_CAMBODIA_DISCOVERY === "enabled" ||
    (process.env.LIVE_CAMBODIA_DISCOVERY !== "disabled" &&
      process.env.NODE_ENV !== "production");
  const liveDiscovery =
    requestedCriteria.country === "Cambodia" &&
    liveDiscoveryEnabled
      ? await discoverCambodiaAssets({ city: requestedCriteria.city })
      : null;
  const advisorAssets = [
    ...(liveDiscovery?.assets ?? []),
    ...source.assets,
    ...listCuratedOpportunities().filter(
      (asset) => !source.assets.some((candidate) => candidate.id === asset.id),
    ),
  ];
  const currentUser = await getCurrentUser();
  const memberContext = currentUser
    ? await ensureMemberContext(currentUser)
    : null;
  const now = Date.now();
  let access: MembershipAccess | null = memberContext
    ? await getMembershipAccess(
        memberContext.database,
        memberContext.workflowUser.id,
        now,
      )
    : null;
  const runtimeAvailable =
    process.env.LLM_PROVIDER === "openai" && Boolean(process.env.OPENAI_API_KEY);
  const canUseDeepSearch =
    access !== null &&
    access.aiMonthlyLimit !== 0 &&
    (access.aiRemaining === null || access.aiRemaining > 0);
  let usageClaimed = false;

  if (runtimeAvailable && canUseDeepSearch && memberContext) {
    access = await claimAiSearch(
      memberContext.database,
      memberContext.workflowUser.id,
      now,
    );
    usageClaimed = access.aiMonthlyLimit !== null;
  }

  const safetyIdentifier = createSafetyIdentifier(
    request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for"),
  );
  const result = await runAdvisorSearch(query, advisorAssets, {
      safetyIdentifier,
      context,
      provider:
        runtimeAvailable && canUseDeepSearch ? "openai" : "disabled",
    });
  const orchestration = planGliAiRequest(query, {
    hasConversationContext: context !== null,
  });
  const liveAssetIds = new Set(liveDiscovery?.assets.map((asset) => asset.id) ?? []);
  const displayedExternalCount = result.matches.filter((asset) =>
    liveAssetIds.has(asset.id),
  ).length;

  if (
    usageClaimed &&
    result.advisor.mode !== "openai" &&
    memberContext &&
    access
  ) {
    await releaseAiSearch(
      memberContext.database,
      memberContext.workflowUser.id,
      access.periodKey,
      Date.now(),
    );
    access = {
      ...access,
      aiUsed: Math.max(0, access.aiUsed - 1),
      aiRemaining:
        access.aiMonthlyLimit === null
          ? null
          : Math.min(
              access.aiMonthlyLimit,
              (access.aiRemaining ?? 0) + 1,
            ),
    };
  }

  return NextResponse.json({
    ...result,
    orchestration,
    dataMode: source.mode,
    membershipAccess: {
      authenticated: Boolean(memberContext),
      planId: access?.planId ?? null,
      runtimeAvailable,
      deepSearchEligible: canUseDeepSearch,
      monthlyLimit: access ? access.aiMonthlyLimit : 0,
      used: access?.aiUsed ?? 0,
      remaining: access ? access.aiRemaining : 0,
      deliveredMode: result.advisor.mode,
    },
    discovery: liveDiscovery
      ? {
          checkedAt: liveDiscovery.checkedAt,
          cached: liveDiscovery.cached,
          collectedCount: liveDiscovery.assets.length,
          displayedCount: displayedExternalCount,
          sources: liveDiscovery.sources,
        }
      : null,
  });
}
