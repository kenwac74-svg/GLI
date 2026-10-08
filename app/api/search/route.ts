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
  type AdvisorConversationTurn,
} from "../../../lib/ai-search";
import {
  extractCriteria,
  parseSearchContext,
} from "../../../lib/search";
import { getCurrentUser } from "../../auth";
import { ensureMemberContext } from "../../../lib/member-data";
import { listCuratedOpportunities } from "../../../lib/curated-opportunities";
import { discoverCambodiaAssets } from "../../../lib/cambodia-live-discovery";
import { planGliAiRequest } from "../../../lib/gli-ai-orchestration";
import { discoverWithGemini } from "../../../lib/gemini-discovery";
import { resolveFollowupReference } from "../../../lib/followup-reference";

// Worst-case request budget: discovery runs concurrently (<= DISCOVERY_TIMEOUT_MS),
// then the advisor gets the remainder instead of its own full 30s on top.
const REQUEST_BUDGET_MS = 45_000;
const DISCOVERY_TIMEOUT_MS = 20_000;
const MIN_ADVISOR_TIMEOUT_MS = 15_000;

// GLI-SPEC: GS-003 GS-004 GS-006 GS-010 GS-012; docs/implementation/API-CONTRACTS.md.
// This synchronous demo path has in-memory discovery; queued persistence and
// a discovery-wide usage gate remain backlog work, not completed integrations.
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

  const conversation = parseConversation(
    typeof body === "object" && body !== null && "conversation" in body
      ? body.conversation
      : undefined,
  );
  if (conversation === null) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_CONVERSATION",
          message: "이전 대화 내용을 확인해 주세요.",
        },
      },
      { status: 400 },
    );
  }

  const previousAssetIds = parsePreviousAssetIds(
    typeof body === "object" && body !== null && "previousAssetIds" in body
      ? body.previousAssetIds
      : undefined,
  );
  if (previousAssetIds === null) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_PREVIOUS_ASSETS",
          message: "이전 검색 결과를 확인해 주세요.",
        },
      },
      { status: 400 },
    );
  }

  const startedAt = Date.now();
  const source = await listAssets({ limit: 100 });
  const requestedCriteria = extractCriteria(query, context);
  const liveDiscoveryEnabled =
    process.env.LIVE_CAMBODIA_DISCOVERY === "enabled" ||
    (process.env.LIVE_CAMBODIA_DISCOVERY !== "disabled" &&
      process.env.NODE_ENV !== "production");
  const geminiDiscoveryEnabled =
    Boolean(process.env.GEMINI_API_KEY) &&
    process.env.GEMINI_DISCOVERY !== "disabled";
  const curatedAssets = listCuratedOpportunities().filter(
    (asset) => !source.assets.some((candidate) => candidate.id === asset.id),
  );
  const isCambodia = requestedCriteria.country === "Cambodia";
  // Web discovery only runs when stored/curated assets cannot fill the list. It
  // starts together with live collection so the two waits overlap, not add up.
  const needsWebDiscovery =
    isCambodia &&
    geminiDiscoveryEnabled &&
    countStrictMatches([...source.assets, ...curatedAssets], requestedCriteria) < 6;
  const [liveDiscovery, webDiscovery] = await Promise.all([
    isCambodia && liveDiscoveryEnabled
      ? discoverCambodiaAssets({ city: requestedCriteria.city }).catch(() => null)
      : null,
    needsWebDiscovery
      ? discoverWithGemini(query, requestedCriteria, {
          timeoutMs: DISCOVERY_TIMEOUT_MS,
        }).catch(() => null)
      : null,
  ]);
  const discoveredAssets = mergeExternalAssets(
    webDiscovery?.assets ?? [],
    liveDiscovery?.assets ?? [],
  );
  const advisorAssets = [
    ...discoveredAssets,
    ...source.assets,
    ...curatedAssets,
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
  const advisorProvider = selectAdvisorProvider();
  const runtimeAvailable = advisorProvider !== "disabled";
  const localAdvisorPreview =
    process.env.NODE_ENV !== "production" && advisorProvider === "gemini";
  const canUseDeepSearch =
    localAdvisorPreview ||
    (access !== null &&
      access.aiMonthlyLimit !== 0 &&
      (access.aiRemaining === null || access.aiRemaining > 0));
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
      conversation,
      focusAssetId: resolveFollowupReference(query, previousAssetIds),
      timeoutMs: Math.max(
        MIN_ADVISOR_TIMEOUT_MS,
        REQUEST_BUDGET_MS - (Date.now() - startedAt),
      ),
      provider: runtimeAvailable && canUseDeepSearch
        ? advisorProvider
        : "disabled",
    });
  const orchestration = planGliAiRequest(query, {
    hasConversationContext: context !== null,
  });
  const liveAssetIds = new Set(discoveredAssets.map((asset) => asset.id));
  const displayedExternalCount = result.matches.filter((asset) =>
    liveAssetIds.has(asset.id),
  ).length;

  if (
    usageClaimed &&
    result.advisor.mode === "rules" &&
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

  const publicAdvisorMode = result.advisor.mode === "rules" ? "rules" : "ai";

  return NextResponse.json({
    ...result,
    advisor: {
      mode: publicAdvisorMode,
      groundedAssetIds: result.advisor.groundedAssetIds,
    },
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
      deliveredMode: publicAdvisorMode,
    },
    discovery: liveDiscovery || webDiscovery
      ? {
          checkedAt:
            webDiscovery?.checkedAt ?? liveDiscovery?.checkedAt ?? new Date().toISOString(),
          cached: Boolean(liveDiscovery?.cached && webDiscovery?.cached),
          collectedCount: discoveredAssets.length,
          displayedCount: displayedExternalCount,
          sources: liveDiscovery?.sources ?? [],
          webSearchCount: webDiscovery?.groundedQueryCount ?? 0,
        }
      : null,
  });
}

function selectAdvisorProvider(): "gemini" | "openai" | "disabled" {
  if (
    process.env.LLM_PROVIDER === "openai" &&
    Boolean(process.env.OPENAI_API_KEY)
  ) {
    return "openai";
  }
  if (
    Boolean(process.env.GEMINI_API_KEY) &&
    process.env.GEMINI_ADVISOR !== "disabled"
  ) {
    return "gemini";
  }
  return "disabled";
}

function parseConversation(value: unknown): AdvisorConversationTurn[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 8) return null;

  const turns: AdvisorConversationTurn[] = [];
  for (const turn of value) {
    if (
      typeof turn !== "object" ||
      turn === null ||
      !("role" in turn) ||
      (turn.role !== "user" && turn.role !== "assistant") ||
      !("text" in turn) ||
      typeof turn.text !== "string"
    ) {
      return null;
    }
    const text = turn.text.trim();
    if (!text || text.length > 1_200) return null;
    turns.push({ role: turn.role, text });
  }
  return turns;
}

function parsePreviousAssetIds(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 20) return null;
  const ids: string[] = [];
  for (const id of value) {
    if (typeof id !== "string" || !id || id.length > 200) return null;
    ids.push(id);
  }
  return ids;
}

function mergeExternalAssets<T extends { sourceUrl?: string; id: string }>(
  preferred: T[],
  fallback: T[],
): T[] {
  const seen = new Set<string>();
  return [...preferred, ...fallback].filter((asset) => {
    const key = asset.sourceUrl?.trim().toLocaleLowerCase("en-US") || asset.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function countStrictMatches<
  T extends {
    country: string;
    city: string;
    district: string;
    transaction: string;
    propertyType: string;
    bedrooms: number;
    price: number;
    title: string;
    summary: string;
  },
>(assets: T[], criteria: ReturnType<typeof extractCriteria>): number {
  const location = (value: string) =>
    value.trim().toLocaleLowerCase("en-US");
  return assets.filter((asset) => {
    if (asset.country !== criteria.country) return false;
    if (criteria.city && location(asset.city) !== location(criteria.city)) return false;
    if (criteria.district && asset.district !== criteria.district) return false;
    if (criteria.transaction && asset.transaction !== criteria.transaction) return false;
    if (criteria.propertyType && asset.propertyType !== criteria.propertyType) return false;
    if (criteria.bedrooms !== null && asset.bedrooms !== criteria.bedrooms) return false;
    if (criteria.maxPriceUsd !== null && asset.price > criteria.maxPriceUsd) return false;
    if (
      criteria.wantsRiver &&
      !/river|mekong|riverside|강|메콩/i.test(`${asset.title} ${asset.summary}`)
    ) {
      return false;
    }
    return true;
  }).length;
}
