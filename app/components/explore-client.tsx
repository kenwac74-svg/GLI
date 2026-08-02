"use client";

import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  CircleAlert,
  Globe2,
  House,
  Landmark,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Palmtree,
  RotateCcw,
  Rocket,
  Search,
  SendHorizontal,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Asset, AssetCategory } from "../../lib/assets";
import type { AdvisorSearchResult } from "../../lib/ai-search";
import type { GliAiPublicPlan } from "../../lib/gli-ai-orchestration";
import type { SearchCriteria } from "../../lib/search";
import { PriceDisplay } from "./price-display";
import {
  EXPLORE_RETURN_KEY,
  EXPLORE_STATE_KEY,
  EXPLORE_STATE_MAX_AGE_MS,
  rememberExploreResult,
} from "../../lib/explore-session";

const prompts = [
  "프놈펜에 5,000만원으로 월세가 잘 나오는 투자가 가능할까?",
  "겨울마다 3개월 쉬고 부재 중 임대할 곳을 찾아줘",
  "월 500달러 이하 2베드 강 전망 임대 콘도",
];

const CATEGORY_OPTIONS = [
  { id: "residential", label: "주거용", caption: "주택·콘도·빌라", icon: House },
  { id: "commercial", label: "상업용", caption: "오피스·리테일·운영 자산", icon: Landmark },
  { id: "leisure", label: "레저", caption: "리조트·관광·라이프스타일", icon: Palmtree },
  { id: "project", label: "프로젝트", caption: "GLI 직접 발굴 사업 기회", icon: Rocket },
] as const;

const COUNTRY_OPTIONS = [
  { id: "all", label: "전체 국가" },
  { id: "Cambodia", label: "캄보디아" },
  { id: "Vietnam", label: "베트남" },
  { id: "Philippines", label: "필리핀" },
  { id: "Malaysia", label: "말레이시아" },
] as const;

const DEFAULT_AI_PROCESS_STAGES: GliAiPublicPlan["stages"] = [
  { id: "intent", label: "요청 이해", description: "" },
  { id: "discovery", label: "후보 탐색", description: "" },
  { id: "review", label: "근거 검토", description: "" },
  { id: "synthesis", label: "답변 구성", description: "" },
];

type CountryFilter = (typeof COUNTRY_OPTIONS)[number]["id"];

type ConversationTurn = {
  id: number;
  role: "user" | "advisor";
  text: string;
  clarification?: string | null;
};

type SearchMembershipAccess = {
  authenticated: boolean;
  planId: "explore" | "investor" | "private" | null;
  runtimeAvailable: boolean;
  deepSearchEligible: boolean;
  monthlyLimit: number | null;
  used: number;
  remaining: number | null;
  deliveredMode: "openai" | "rules";
};

type SearchDiscovery = {
  checkedAt: string;
  cached: boolean;
  collectedCount: number;
  displayedCount: number;
  sources: Array<{
    slug: string;
    name: string;
    status: "collected" | "snapshot" | "unavailable";
    count: number;
  }>;
};

type StoredExploreState = {
  savedAt: number;
  assets: Asset[];
  turns: ConversationTurn[];
  criteria: SearchCriteria;
  citations: AdvisorSearchResult["citations"];
  searchAccess: SearchMembershipAccess;
  discovery: SearchDiscovery | null;
  orchestration?: GliAiPublicPlan | null;
  filter: "all" | "sale" | "rent" | "direct";
  assetCategory: AssetCategory;
  countryFilter: CountryFilter;
};

const welcomeTurn: ConversationTurn = {
  id: 0,
  role: "advisor",
  text: "찾으시는 목적과 예산을 편하게 말씀해 주세요. 조건을 정리해 검토할 후보와 확인할 위험을 함께 보여드립니다.",
};

export function ExploreClient({
  initialAssets,
  curatedAssets,
}: {
  initialAssets: Asset[];
  curatedAssets: Asset[];
}) {
  const [query, setQuery] = useState("");
  const [assets, setAssets] = useState(initialAssets);
  const [turns, setTurns] = useState<ConversationTurn[]>([welcomeTurn]);
  const [criteria, setCriteria] = useState<SearchCriteria | null>(null);
  const [citations, setCitations] = useState<
    AdvisorSearchResult["citations"]
  >([]);
  const [loading, setLoading] = useState(false);
  const [searchAccess, setSearchAccess] =
    useState<SearchMembershipAccess | null>(null);
  const [discovery, setDiscovery] = useState<SearchDiscovery | null>(null);
  const [orchestration, setOrchestration] =
    useState<GliAiPublicPlan | null>(null);
  const [activeProcessStep, setActiveProcessStep] = useState(0);
  const [filter, setFilter] = useState<"all" | "sale" | "rent" | "direct">("all");
  const [assetCategory, setAssetCategory] =
    useState<AssetCategory>("residential");
  const [countryFilter, setCountryFilter] = useState<CountryFilter>("all");

  useEffect(() => {
    const returnState = window.sessionStorage.getItem(EXPLORE_RETURN_KEY);
    const storedState = window.sessionStorage.getItem(EXPLORE_STATE_KEY);
    if (!returnState || !storedState) return;
    let restoreTimer: number | undefined;
    try {
      const restored = JSON.parse(storedState) as StoredExploreState;
      if (
        typeof restored.savedAt !== "number" ||
        Date.now() - restored.savedAt >= EXPLORE_STATE_MAX_AGE_MS ||
        !Array.isArray(restored.assets) ||
        !Array.isArray(restored.turns) ||
        !restored.criteria
      ) {
        return;
      }
      restoreTimer = window.setTimeout(() => {
        setAssets(restored.assets);
        setTurns(restored.turns);
        setCriteria(restored.criteria);
        setCitations(restored.citations ?? []);
        setSearchAccess(restored.searchAccess ?? null);
        setDiscovery(restored.discovery ?? null);
        setOrchestration(restored.orchestration ?? null);
        setFilter(restored.filter ?? "all");
        setAssetCategory(restored.assetCategory ?? "residential");
        setCountryFilter(restored.countryFilter ?? "all");
      }, 0);
    } catch {
      window.sessionStorage.removeItem(EXPLORE_STATE_KEY);
    } finally {
      window.sessionStorage.removeItem(EXPLORE_RETURN_KEY);
    }
    return () => {
      if (restoreTimer !== undefined) window.clearTimeout(restoreTimer);
    };
  }, []);

  useEffect(() => {
    if (!loading) return;
    setActiveProcessStep(0);
    const timer = window.setInterval(() => {
      setActiveProcessStep((current) => Math.min(current + 1, 3));
    }, 850);
    return () => window.clearInterval(timer);
  }, [loading]);

  const visibleAssets = useMemo(
    () => {
      const categoryAssets = criteria
        ? assets.filter(
            (asset) => (asset.assetCategory ?? "residential") === assetCategory,
          )
        : assetCategory === "residential"
          ? [
              ...assets,
              ...curatedAssets.filter(
                (asset) => asset.assetCategory === "residential",
              ),
            ]
          : curatedAssets.filter(
              (asset) => asset.assetCategory === assetCategory,
            );

      return categoryAssets.filter((asset) => {
        if (countryFilter !== "all" && asset.country !== countryFilter) {
          return false;
        }
        if (assetCategory !== "residential" || filter === "all") return true;
        if (filter === "direct") return asset.isGliDirect;
        return asset.transaction === filter;
      });
    },
    [assetCategory, assets, countryFilter, criteria, curatedAssets, filter],
  );

  async function runSearch(value: string) {
    const clean = value.trim();
    if (!clean || loading) return;
    const userTurn: ConversationTurn = {
      id: Date.now(),
      role: "user",
      text: clean,
    };
    setTurns((current) => [...current, userTurn].slice(-9));
    setQuery("");
    setLoading(true);
    setOrchestration(null);
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: clean, context: criteria ?? undefined }),
      });
      if (!response.ok) throw new Error("search_failed");
      const result = (await response.json()) as AdvisorSearchResult & {
        membershipAccess: SearchMembershipAccess;
        discovery: SearchDiscovery | null;
        orchestration: GliAiPublicPlan;
      };
      setAssets(result.matches);
      setCriteria(result.criteria);
      setCitations(result.citations);
      setSearchAccess(result.membershipAccess);
      setDiscovery(result.discovery);
      setOrchestration(result.orchestration);
      setFilter("all");
      setAssetCategory(result.matches[0]?.assetCategory ?? "residential");
      setCountryFilter(result.criteria.country as CountryFilter);
      const resultCategory = result.matches[0]?.assetCategory ?? "residential";
      const resultCountry = result.criteria.country as CountryFilter;
      setTurns((current) => {
        const nextTurns = [
          ...current,
          {
            id: Date.now() + 1,
            role: "advisor" as const,
            text: result.answer,
            clarification: result.clarification,
          },
        ].slice(-10);
        const stored: StoredExploreState = {
          savedAt: Date.now(),
          assets: result.matches,
          turns: nextTurns,
          criteria: result.criteria,
          citations: result.citations,
          searchAccess: result.membershipAccess,
          discovery: result.discovery,
          orchestration: result.orchestration,
          filter: "all",
          assetCategory: resultCategory,
          countryFilter: resultCountry,
        };
        window.sessionStorage.setItem(EXPLORE_STATE_KEY, JSON.stringify(stored));
        return nextTurns;
      });
    } catch {
      setTurns((current) =>
        [
          ...current,
          {
            id: Date.now() + 1,
            role: "advisor" as const,
            text: "검색을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
          },
        ].slice(-10),
      );
      setCitations([]);
      setDiscovery(null);
      setOrchestration(null);
    } finally {
      setLoading(false);
      window.setTimeout(() => {
        document.getElementById("advisor")?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 50);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void runSearch(query);
  }

  function resetConversation() {
    setQuery("");
    setAssets(initialAssets);
    setTurns([welcomeTurn]);
    setCriteria(null);
    setCitations([]);
    setSearchAccess(null);
    setDiscovery(null);
    setOrchestration(null);
    setFilter("all");
    setAssetCategory("residential");
    setCountryFilter("all");
    window.sessionStorage.removeItem(EXPLORE_RETURN_KEY);
    window.sessionStorage.removeItem(EXPLORE_STATE_KEY);
  }

  const activeCriteria = criteria ? describeCriteria(criteria) : [];

  return (
    <>
      <section className="explore-hero">
        <div className="hero-scrim" />
        <div className="hero-content">
          <p className="eyebrow">
            <Sparkles size={15} /> GLI AI INVESTMENT ADVISOR
          </p>
          <h1>
            <span>국가와 자산의 경계를 넘어,</span>
            <span>검증된 투자 기회를 탐색하세요</span>
          </h1>
          <p className="hero-copy">
            <span>
              예산과 투자 목적, 원하는 라이프스타일을 이야기하면 GLI가 적합한 후보와 자료 신뢰도,
            </span>
            <span>다음 확인 단계를 한 번에 정리합니다.</span>
          </p>
          <form className="search-composer" onSubmit={submit}>
            <label htmlFor="asset-query">어떤 투자 기회를 찾고 계세요?</label>
            <div className="composer-row">
              <textarea
                id="asset-query"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="예: 프놈펜에 5,000만원 정도로 월세가 잘 나오는 투자를 할 수 있을까?"
                rows={3}
              />
              <button type="submit" disabled={loading} aria-label="AI 검색 실행">
                {loading ? <LoaderCircle className="spin" size={22} /> : <Search size={22} />}
                <span>탐색</span>
              </button>
            </div>
            <div className="prompt-row" aria-label="예시 질문">
              {prompts.map((prompt) => (
                <button
                  type="button"
                  key={prompt}
                  onClick={() => {
                    setQuery(prompt);
                    void runSearch(prompt);
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </form>
        </div>
      </section>

      <main className="explore-main">
        <section className="advisor-response advisor-conversation" id="advisor">
          <div className="advisor-panel-head">
            <div className="advisor-heading">
              <div className="advisor-icon">
                <MessageCircle size={22} />
              </div>
              <div>
                <span>GLI AI INVESTMENT ADVISOR</span>
                <h2>조건을 이어서 상담하세요</h2>
              </div>
            </div>
            {criteria && (
              <button
                className="conversation-reset"
                type="button"
                onClick={resetConversation}
              >
                <RotateCcw size={15} />
                새 탐색
              </button>
            )}
          </div>

          {searchAccess && (
            <div className="search-access-status" role="status">
              <div>
                <strong>
                  {searchAccess.deliveredMode === "openai"
                    ? "GLI 심화 투자 탐색"
                    : "GLI 빠른 자산 탐색"}
                </strong>
                <span>{searchAccessLabel(searchAccess)}</span>
              </div>
              {(!searchAccess.authenticated || !searchAccess.planId) && (
                <Link href="/membership">
                  멤버십 보기 <ArrowRight size={14} />
                </Link>
              )}
            </div>
          )}

          {(loading || orchestration) && (
            <div className="gli-ai-process" role="status" aria-live="polite">
              <div className="gli-ai-process-head">
                <div>
                  <strong>GLI AI 통합 분석</strong>
                  <span>
                    {loading
                      ? "질문의 목적에 맞춰 탐색과 검토 단계를 진행하고 있습니다."
                      : orchestration?.summary}
                  </span>
                </div>
                {loading ? (
                  <LoaderCircle className="spin" size={19} />
                ) : (
                  <CheckCircle2 size={19} />
                )}
              </div>
              <div className="gli-ai-process-steps">
                {(orchestration?.stages ?? DEFAULT_AI_PROCESS_STAGES).map(
                  (stage, index) => {
                    const completed = !loading || index < activeProcessStep;
                    const active = loading && index === activeProcessStep;
                    return (
                      <div
                        className={`${completed ? "is-complete" : ""} ${active ? "is-active" : ""}`}
                        key={stage.id}
                      >
                        <span>
                          {completed ? <CheckCircle2 size={16} /> : index + 1}
                        </span>
                        <strong>{stage.label}</strong>
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          )}

          {discovery && discovery.collectedCount > 0 && (
            <div className="search-access-status live-discovery-status" role="status">
              <div>
                <strong>
                  {discovery.sources.some((source) => source.status === "collected")
                    ? "캄보디아 공개 매물 실시간 탐색"
                    : "캄보디아 공개 매물 검색"}
                </strong>
                <span>
                  정보 사이트 {discovery.sources.filter((source) => source.status !== "unavailable").length}곳에서
                  후보 {discovery.collectedCount}건을 확인했고, 현재 조건과 일치하는 외부 매물 {discovery.displayedCount ?? 0}건을 표시합니다.
                </span>
              </div>
              <BadgeCheck size={18} />
            </div>
          )}

          <div className="conversation-log" aria-live="polite" aria-busy={loading}>
            {turns.map((turn) => (
              <div className={`conversation-turn ${turn.role}`} key={turn.id}>
                <span>{turn.role === "user" ? "나" : "GLI AI"}</span>
                <p>{turn.text}</p>
                {turn.clarification && (
                  <p className="clarification">
                    <strong>추가 질문</strong>
                    {turn.clarification}
                  </p>
                )}
              </div>
            ))}
            {loading && (
              <div className="conversation-turn advisor loading-turn">
                <LoaderCircle className="spin" size={18} />
                <p>
                  공개 정보 사이트와 GLI 보유 자산에서 조건에 맞는 후보를 확인하고 있습니다.
                </p>
              </div>
            )}
          </div>

          {activeCriteria.length > 0 && (
            <div className="active-criteria" aria-label="현재 적용 중인 검색 조건">
              <strong>현재 조건</strong>
              {activeCriteria.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          )}

          {criteria && (
            <form className="followup-composer" onSubmit={submit}>
              <label htmlFor="followup-query">답변하거나 조건을 더해주세요</label>
              <div>
                <input
                  id="followup-query"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="예: 예산은 1억이고 BKK1을 우선해줘"
                  maxLength={800}
                />
                <button type="submit" disabled={loading || !query.trim()}>
                  {loading ? (
                    <LoaderCircle className="spin" size={19} />
                  ) : (
                    <SendHorizontal size={19} />
                  )}
                  <span>보내기</span>
                </button>
              </div>
            </form>
          )}

          {citations.length > 0 && (
            <div className="advisor-citations" aria-label="답변 근거 매물">
              <strong>
                <BadgeCheck size={14} /> 근거 매물
              </strong>
              {citations.map((citation) => (
                <Link key={citation.assetId} href={`/assets/${citation.assetId}`}>
                  {citation.label}
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="asset-discovery" id="assets">
          <div className="asset-discovery-head">
            <div>
              <p className="section-kicker">
                <Globe2 size={15} /> GLOBAL ASSET DISCOVERY
              </p>
              <h2>투자 자산 탐색</h2>
            </div>
            <div className="country-tabs" aria-label="국가 선택">
              {COUNTRY_OPTIONS.map((country) => (
                <button
                  key={country.id}
                  type="button"
                  className={countryFilter === country.id ? "is-active" : ""}
                  onClick={() => setCountryFilter(country.id)}
                >
                  {country.label}
                </button>
              ))}
            </div>
          </div>

          <div className="asset-category-tabs" aria-label="자산 카테고리">
            {CATEGORY_OPTIONS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={assetCategory === item.id ? "is-active" : ""}
                  aria-pressed={assetCategory === item.id}
                  onClick={() => {
                    setAssetCategory(item.id);
                    setFilter("all");
                  }}
                >
                  <Icon size={21} />
                  <span>{item.label}</span>
                  <small>{item.caption}</small>
                </button>
              );
            })}
          </div>
        </section>

        <section className="result-section">
          <div className="section-head">
            <div>
              <p className="section-kicker">
                {criteria
                  ? `AI SEARCH · ${countryLabel(criteria.country)}`
                  : `${countryFilter === "all" ? "GLOBAL" : countryLabel(countryFilter)} · ${categoryLabel(assetCategory)}`}
              </p>
              <h2>
                {criteria
                  ? `${categoryLabel(assetCategory)} 검색 결과`
                  : `${categoryLabel(assetCategory)} 추천 자산`}
              </h2>
              <span>
                {criteria
                  ? `이번 조건에 맞는 후보 ${visibleAssets.length}개입니다.`
                  : `${visibleAssets.length}개 후보를 비교 중입니다.`}
              </span>
            </div>
            {assetCategory === "residential" ? (
              <div className="segmented" aria-label="자산 필터">
                {[
                  ["all", "전체"],
                  ["sale", "매매"],
                  ["rent", "임대"],
                  ["direct", "GLI 추천"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    className={filter === value ? "active" : ""}
                    onClick={() => setFilter(value as typeof filter)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {visibleAssets.length ? (
            <div className="asset-grid">
              {visibleAssets.map((asset) => (
                <article className="asset-card" key={asset.id}>
                  <div className="asset-photo">
                    {/* External listing imagery is temporary licensed demo media. */}
                    <Image
                      src={asset.image}
                      alt={`${asset.title} 내부 또는 건물 이미지`}
                      fill
                      sizes="(max-width: 680px) 100vw, (max-width: 960px) 50vw, 33vw"
                      unoptimized
                    />
                    <div className="asset-badges">
                      <span>{asset.categoryLabel ?? "주거용"}</span>
                      {asset.originLabel ? (
                        <strong>{asset.originLabel}</strong>
                      ) : (
                        asset.isGliDirect && <strong>GLI 추천</strong>
                      )}
                    </div>
                  </div>
                  <div className="asset-card-body">
                    <p className="asset-location">
                      <MapPin size={14} /> {asset.district}, {asset.city}
                    </p>
                    <h3>{asset.title}</h3>
                    <p className="asset-spec">
                      {asset.cardMeta ?? `${asset.areaSqm}㎡ · ${asset.bedrooms || "Studio"}BR · ${asset.bathrooms}Bath`}
                    </p>
                    {"matchReasons" in asset && Array.isArray(asset.matchReasons) && (
                      <div className="reason-row">
                        {(asset.matchReasons as string[]).map((reason) => (
                          <span key={reason}>{reason}</span>
                        ))}
                      </div>
                    )}
                    <div className="asset-card-foot">
                      <PriceDisplay
                        amount={asset.price}
                        maxAmount={asset.maxPrice}
                        currency={asset.currency}
                        contextLabel={
                          asset.offerLabel ??
                          (asset.transaction === "rent" ? "월 임대료" : "매매가")
                        }
                        originalLabel={asset.priceLabel}
                      />
                      <div className={`trust-pill status-${asset.trustStatus.toLowerCase()}`}>
                        <ShieldCheck size={17} />
                        <span>
                          Trust <b>{asset.trustScore}</b>
                        </span>
                      </div>
                    </div>
                    <Link
                      className="asset-link"
                      href={`/assets/${asset.id}`}
                      onClick={() => rememberExploreResult(asset.id)}
                    >
                      상세 정보 확인 <ArrowRight size={17} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <CircleAlert size={25} />
              <h3>현재 조건에 맞는 후보가 없습니다</h3>
              <p>
                {assetCategory === "residential"
                  ? "예산이나 침실 수를 조금 넓혀 다시 질문해 보세요."
                  : "다른 국가를 선택하거나 다른 자산 범주를 살펴보세요."}
              </p>
            </div>
          )}
          <a
            className="fx-attribution"
            href="https://www.exchangerate-api.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            환산 가격은 참고용입니다 · Rates by Exchange Rate API
          </a>
        </section>

        <section className="trust-band">
          <div>
            <p className="section-kicker">GLI TRUST STANDARD</p>
            <h2>AI가 탐색하고, 전문가가 직접 검증합니다</h2>
            <p>
              AI가 여러 출처의 자산 정보를 탐색하고 교차 분석하면, GLI 전문가가 핵심
              자료와 현지 확인 사항을 직접 검토합니다. Trust Score는 AI와 사람의 상호보완
              검토를 통해 확인된 현재 정보의 완전성, 최신성, 일관성을 나타냅니다.
            </p>
          </div>
          <div className="trust-steps">
            <div>
              <Building2 size={22} />
              <strong>표준화</strong>
              <span>가격·면적·위치 통합</span>
            </div>
            <div>
              <BadgeCheck size={22} />
              <strong>근거 평가</strong>
              <span>최신성과 자료 일치 확인</span>
            </div>
            <div>
              <CheckCircle2 size={22} />
              <strong>사람 검토</strong>
              <span>고급 리포트 별도 승인</span>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function categoryLabel(category: AssetCategory): string {
  const labels: Record<AssetCategory, string> = {
    residential: "주거용",
    commercial: "상업용",
    leisure: "레저",
    project: "프로젝트",
  };
  return labels[category];
}

function countryLabel(country: Exclude<CountryFilter, "all">): string {
  const labels: Record<Exclude<CountryFilter, "all">, string> = {
    Cambodia: "캄보디아",
    Vietnam: "베트남",
    Philippines: "필리핀",
    Malaysia: "말레이시아",
  };
  return labels[country];
}

function describeCriteria(criteria: SearchCriteria): string[] {
  const purposeLabels: Record<SearchCriteria["purpose"], string> = {
    income: "임대수익",
    seasonal: "계절 체류",
    residence: "실거주",
    general: "일반 탐색",
  };
  const items = [purposeLabels[criteria.purpose]];
  if (criteria.transaction) {
    items.push(criteria.transaction === "sale" ? "매매" : "임대");
  }
  if (criteria.district) items.push(criteria.district);
  if (criteria.propertyType) {
    const labels: Record<Asset["propertyType"], string> = {
      condo: "콘도",
      house: "주택",
      villa: "빌라",
      land: "토지",
      commercial: "상업용",
    };
    items.push(labels[criteria.propertyType]);
  }
  if (criteria.budgetKrw) {
    items.push(`약 ${(criteria.budgetKrw / 10_000).toLocaleString("ko-KR")}만원`);
  } else if (criteria.maxPriceUsd) {
    items.push(`$${criteria.maxPriceUsd.toLocaleString("en-US")} 이하`);
  }
  if (criteria.bedrooms !== null) items.push(`${criteria.bedrooms}베드`);
  if (criteria.wantsShortStay) items.push("부재 중 단기 임대");
  if (criteria.wantsRiver) items.push("강 전망");
  return items;
}

function searchAccessLabel(access: SearchMembershipAccess): string {
  if (!access.authenticated) {
    return "로그인 없이 기본 추천을 이용 중입니다.";
  }
  if (!access.planId) {
    return "Explore부터 근거 기반 심화 AI 답변을 이용할 수 있습니다.";
  }
  if (!access.runtimeAvailable) {
    return "AI 연결 대기 중에는 사용량 차감 없이 기본 추천을 제공합니다.";
  }
  if (access.monthlyLimit === null) {
    return "무제한 심화 AI 검색이 적용되었습니다.";
  }
  return `이번 달 ${access.used}/${access.monthlyLimit}회 사용`;
}
