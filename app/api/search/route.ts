import { NextResponse } from "next/server";
import {
  claimAiSearch,
  getMembershipAccess,
  releaseAiSearch,
  type MembershipAccess,
} from "../../../db/membership-entitlements.ts";
import { getAsset, listAssets } from "../../../lib/assets-data";
import {
  createSafetyIdentifier,
  runAdvisorSearch,
} from "../../../lib/ai-search";
import {
  parseSearchContext,
  searchCountries,
} from "../../../lib/search";
import { getCurrentUser } from "../../auth";
import { ensureMemberContext, getWorkflowDatabase, workflowErrorResponse } from "../../../lib/member-data";
import { listCuratedOpportunities } from "../../../lib/curated-opportunities";
import { discoverCambodiaAssets } from "../../../lib/cambodia-live-discovery";
import { planGliAiRequest } from "../../../lib/gli-ai-orchestration";
import { discoverWithGemini } from "../../../lib/gemini-discovery";
import { isDemoGuestAdvisor, isLocalAdvisorPreview, selectAdvisorProvider } from "../../../lib/advisor-runtime";
import { prepareConsultationSearch } from "../../../lib/consultation-search";
import { parseAssetReferences, resolveAssetReferences } from "../../../lib/consultation-references";
import { assetLocale, localizeAssets } from "../../../lib/asset-localization";
import { createAiOperation } from "../../../lib/ai-operation";
import { parseConversation } from "../../../lib/conversation-context";
import { discoverVietnamReferences, isVietnamDemoRequestEnabled } from "../../../lib/vietnam-discovery.ts";
import { discoverPhilippinesAssets, isPhilippinesDemoRequestEnabled } from "../../../lib/philippines-discovery.ts";
import { getExchangeRates } from "../../../lib/exchange-rates.ts";
import { collectSearchCountries } from "../../../lib/multi-country-discovery.ts";
import { getDiscoveryRepository } from "../../../lib/discovery-storage.ts";
import { DiscoveryPersistenceError } from "../../../db/discovery-repository.ts";

// GLI-SPEC: GS-003 GS-004 GS-006 GS-010 GS-012; docs/implementation/API-CONTRACTS.md.
// P38 guards paid stages; P50 stores original discovery before translation.
export async function POST(request: Request) {
  try { return await search(request); }
  catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    return workflowErrorResponse(error);
  }
}

async function search(request: Request) {
  request.signal.throwIfAborted();
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

  const fields = body as Record<string, unknown>;
  const locale = assetLocale(fields.locale);
  if (!locale) {
    return NextResponse.json({ error: { code: "INVALID_LOCALE", message: "지원하는 언어를 확인해 주세요." } }, { status: 400 });
  }
  const previousAssetIds = parseAssetReferences(fields.previousAssetIds);
  const selectedAssetIds = parseAssetReferences(fields.selectedAssetIds);
  if (!previousAssetIds || !selectedAssetIds || selectedAssetIds.some(id => !previousAssetIds.includes(id))) {
    return NextResponse.json({ error: { code: "INVALID_ASSET_REFERENCES", message: "이전 후보 정보를 확인해 주세요." } }, { status: 400 });
  }
  // Resolve only public records. Never reuse client-supplied prices or summaries.
  const references = await resolveAssetReferences(previousAssetIds, async id => (await getAsset(id)).asset);
  const currentUser = await getCurrentUser();
  const memberContext = currentUser ? await ensureMemberContext(currentUser) : null;
  const operation = createAiOperation({
    database: async () => memberContext?.database ?? await getWorkflowDatabase(),
    // Anonymous visitors share a conservative pool until durable guest identity
    // is approved. Never trust a caller-controlled forwarded IP as an account.
    actor: memberContext?.workflowUser.id ?? "anonymous-demo",
    signal: request.signal,
  });
  const now = Date.now();
  let access: MembershipAccess | null = memberContext
    ? await getMembershipAccess(memberContext.database, memberContext.workflowUser.id, now)
    : null;
  const advisorProvider = selectAdvisorProvider();
  const runtimeAvailable = advisorProvider !== "disabled";
  const localAdvisorPreview = isLocalAdvisorPreview(request.url, advisorProvider);
  const guestAdvisor = memberContext === null && isDemoGuestAdvisor();
  const canUseDeepSearch = localAdvisorPreview || guestAdvisor ||
    (access !== null && access.aiMonthlyLimit !== 0 && (access.aiRemaining === null || access.aiRemaining > 0));
  let usageClaimed = false;
  let deliveredAi = false;
  // Claim once for the whole consultation, before either paid OpenRouter call.
  if (runtimeAvailable && canUseDeepSearch && memberContext && !localAdvisorPreview) {
    access = await claimAiSearch(memberContext.database, memberContext.workflowUser.id, now);
    usageClaimed = access.aiMonthlyLimit !== null;
  }
  const provider = runtimeAvailable && canUseDeepSearch ? advisorProvider : "disabled";
  try {
  request.signal.throwIfAborted();
  const localization = { fetchImpl: operation.forStage("translation"), signal: request.signal };
  const referenceAssets = await localizeAssets(references.flatMap(reference => reference.asset ? [reference.asset] : []), locale, localization);
  for (const reference of references) reference.asset = referenceAssets.find(asset => asset.id === reference.id) ?? null;
  request.signal.throwIfAborted();
  const source = await listAssets({ limit: 100 });
  const discoveryRepository = await getDiscoveryRepository();
  let persistedCount = 0;
  let persistenceFailed = false;
  let freshCount = 0;
  const discovery: {
    live: Awaited<ReturnType<typeof collectSearchCountries>> | null;
    web: Awaited<ReturnType<typeof discoverWithGemini>> | null;
  } = { live: null, web: null };
  let discoveredAssets: Awaited<ReturnType<typeof discoverCambodiaAssets>>["assets"] = [];
  const exchange = await getExchangeRates();
  const prepared = await prepareConsultationSearch(query, {
    provider, context, conversation, references, selectedAssetIds, locale,
    exchangeRate: exchange && !exchange.stale ? exchange.snapshot : null,
    fetch: operation.forStage("intent"),
    decisionFetch: provider === "openrouter" && process.env.GLI_JEV_ROUTING !== "disabled"
      ? operation.forStage("decision") : undefined,
  }, async (requestedCriteria) => {
  request.signal.throwIfAborted();
  const liveDiscoveryEnabled =
    process.env.LIVE_CAMBODIA_DISCOVERY === "enabled" ||
    (process.env.LIVE_CAMBODIA_DISCOVERY !== "disabled" &&
      process.env.NODE_ENV !== "production");
  const geminiDiscoveryEnabled =
    Boolean(process.env.GEMINI_API_KEY) &&
    process.env.GEMINI_DISCOVERY !== "disabled";
  // Scout in parallel with lightweight listing feeds, never only after DB scarcity.
  const webJob = geminiDiscoveryEnabled
    ? discoverWithGemini(query, requestedCriteria, { refresh: true, exchangeRate: exchange && !exchange.stale ? exchange.snapshot : null, fetchImpl: operation.forStage("discovery"), signal: request.signal, scope: operation.scope })
    : Promise.resolve(null);
  const liveDiscovery = discovery.live = await collectSearchCountries(requestedCriteria, async country =>
    country === "Cambodia" && liveDiscoveryEnabled
      ? discoverCambodiaAssets({ city: requestedCriteria.city, refresh: true })
      : country === "Vietnam" && await isVietnamDemoRequestEnabled(request.url)
        ? discoverVietnamReferences({ enabled: true, refresh: true })
      : country === "Philippines" && await isPhilippinesDemoRequestEnabled(request.url)
        ? discoverPhilippinesAssets({ enabled: true, refresh: true }) : null);
  const curatedAssets = listCuratedOpportunities().filter(
    (asset) => !source.assets.some((candidate) => candidate.id === asset.id),
  );
  request.signal.throwIfAborted();
  const webDiscovery = discovery.web = await webJob;
  discoveredAssets = mergeExternalAssets(
    webDiscovery?.assets ?? [],
    liveDiscovery?.assets ?? [],
  );
  freshCount = discoveredAssets.length;
  // A cached collection keeps its original observation time, never today's
  // request time. Stored candidates remain unverified if the source is offline.
  if (discoveryRepository) {
    const saved = [];
    for (const collection of [liveDiscovery,webDiscovery]) {
      if (!collection) continue;
      try { saved.push(...await discoveryRepository.save(collection.assets,collection.checkedAt)); }
      catch (error) {
        persistenceFailed = true;
        if (error instanceof DiscoveryPersistenceError) saved.push(...error.savedAssets);
      }
    }
    persistedCount = new Set(saved.map(asset => asset.id)).size;
    let retained: typeof discoveredAssets = [];
    try { retained = await discoveryRepository.list(searchCountries(requestedCriteria)); }
    catch { persistenceFailed = true; }
    discoveredAssets = mergeExternalAssets([...saved, ...discoveredAssets], retained);
  }
  return [
    ...discoveredAssets,
    ...source.assets,
    ...curatedAssets,
  ];
  });
  const { live: liveDiscovery, web: webDiscovery } = discovery;
  prepared.preparedSearch.coverage = liveDiscovery?.coverage;
  request.signal.throwIfAborted();

  // Filter against original source fields first; translate only visible results.
  // Review candidates were already localized above, so never translate a translation.
  if (!prepared.review) {
    prepared.preparedSearch.matches = await localizeAssets(prepared.preparedSearch.matches, locale, localization);
    const localized = new Map(prepared.preparedSearch.matches.map(asset => [asset.id, asset]));
    prepared.assets = prepared.assets.map(asset => localized.get(asset.id) ?? asset);
  }

  if (exchange && !exchange.stale) {
    prepared.preparedSearch.rate = { krwPerUsd: exchange.snapshot.rates.KRW!,
      asOf: exchange.snapshot.updatedAt, rates: exchange.snapshot.rates };
  }

  const safetyIdentifier = createSafetyIdentifier(
    request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for"),
  );
  const result = await runAdvisorSearch(query, prepared.assets, {
      locale,
      fetch: operation.forStage("advisor"),
      safetyIdentifier,
      context,
      conversation,
      preparedSearch: prepared.preparedSearch,
      review: prepared.review,
      provider: prepared.intent.clarification ? "disabled" : provider,
    });
  request.signal.throwIfAborted();
  const plannedOrchestration = planGliAiRequest(query, {
    hasConversationContext: context !== null,
  });
  const orchestration = prepared.intent.clarification
    ? { ...plannedOrchestration, depth: "quick" as const,
        summary: prepared.intent.clarification, stages: plannedOrchestration.stages.slice(0, 1) }
    : plannedOrchestration;
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
    usageClaimed = false;
  }

  const publicAdvisorMode = result.advisor.mode === "rules" ? "rules" : "ai";
  deliveredAi = publicAdvisorMode === "ai";

  return NextResponse.json({
    ...result,
    locale,
    resultSet: { assetIds: result.matches.map(asset => asset.id), returnedCount: result.matches.length },
    consultation: {
      mode: prepared.intent.clarification ? "clarify" : prepared.review
        ? prepared.review.needsClarification ? "clarify" : "review" : "search",
      referencedAssetIds: prepared.review?.assetIds ?? [],
      missingAssetIds: prepared.review?.missingAssetIds ?? [],
    },
    advisor: {
      mode: publicAdvisorMode,
      groundedAssetIds: result.advisor.groundedAssetIds,
    },
    orchestration,
    dataMode: source.mode,
    operationalAccess: { limited: operation.state.blocked, unavailable: operation.state.auditFailed },
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
          cached: Boolean((liveDiscovery?.cached ?? true) && (webDiscovery?.cached ?? true)),
          collectedCount: freshCount,
          storage: { mode: discoveryRepository ? "d1" : "disabled", savedCount: persistedCount,
            status: persistenceFailed ? "failed" : discoveryRepository ? "saved" : "disabled" },
          displayedCount: displayedExternalCount,
          sources: liveDiscovery?.sources ?? [],
          countries: liveDiscovery?.coverage ?? [],
          webSearchCount: webDiscovery?.groundedQueryCount ?? 0,
        }
      : null,
  });
  } finally {
    // A canceled/failed consultation may return customer allowance, never the
    // operating attempt or provider-call ledger (which may already be billed).
    if (usageClaimed && !deliveredAi && memberContext && access) {
      await releaseAiSearch(memberContext.database, memberContext.workflowUser.id, access.periodKey, Date.now());
    }
  }
}

function mergeExternalAssets<T extends { sourceUrl?: string; id: string; transaction?: string }>(
  preferred: T[],
  fallback: T[],
): T[] {
  const seen = new Set<string>();
  return [...preferred, ...fallback].filter((asset) => {
    const key = asset.sourceUrl ? `${asset.sourceUrl.trim().toLocaleLowerCase("en-US")}:${asset.transaction ?? ""}` : asset.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

