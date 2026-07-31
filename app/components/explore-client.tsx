"use client";

import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  MapPin,
  MessageCircle,
  RotateCcw,
  Search,
  SendHorizontal,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import type { Asset } from "../../lib/assets";
import type { AdvisorSearchResult } from "../../lib/ai-search";
import type { SearchCriteria } from "../../lib/search";

const prompts = [
  "프놈펜에 5,000만원으로 월세가 잘 나오는 투자가 가능할까?",
  "겨울마다 3개월 쉬고 부재 중 임대할 곳을 찾아줘",
  "월 500달러 이하 2베드 강 전망 임대 콘도",
];

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

const welcomeTurn: ConversationTurn = {
  id: 0,
  role: "advisor",
  text: "찾으시는 목적과 예산을 편하게 말씀해 주세요. 조건을 정리해 검토할 후보와 확인할 위험을 함께 보여드립니다.",
};

export function ExploreClient({ initialAssets }: { initialAssets: Asset[] }) {
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
  const [filter, setFilter] = useState<"all" | "sale" | "rent" | "direct">("all");

  const visibleAssets = useMemo(
    () =>
      assets.filter((asset) => {
        if (filter === "all") return true;
        if (filter === "direct") return asset.isGliDirect;
        return asset.transaction === filter;
      }),
    [assets, filter],
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
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: clean, context: criteria ?? undefined }),
      });
      if (!response.ok) throw new Error("search_failed");
      const result = (await response.json()) as AdvisorSearchResult & {
        membershipAccess: SearchMembershipAccess;
      };
      setAssets(result.matches);
      setCriteria(result.criteria);
      setCitations(result.citations);
      setSearchAccess(result.membershipAccess);
      setFilter("all");
      setTurns((current) =>
        [
          ...current,
          {
            id: Date.now() + 1,
            role: "advisor" as const,
            text: result.answer,
            clarification: result.clarification,
          },
        ].slice(-10),
      );
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
    setFilter("all");
  }

  const activeCriteria = criteria ? describeCriteria(criteria) : [];

  return (
    <>
      <section className="explore-hero">
        <div className="hero-scrim" />
        <div className="hero-content">
          <p className="eyebrow">
            <Sparkles size={15} /> GLI AI PROPERTY ADVISOR
          </p>
          <h1>캄보디아 부동산, 질문부터 시작하세요</h1>
          <p className="hero-copy">
            예산과 삶의 방식을 이야기하면 GLI가 후보를 찾고, 자료 신뢰도와 다음 확인
            단계를 한 번에 정리합니다.
          </p>
          <form className="search-composer" onSubmit={submit}>
            <label htmlFor="asset-query">어떤 부동산을 찾고 계세요?</label>
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
                <span>GLI AI PROPERTY ADVISOR</span>
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
                    ? "멤버십 심화 AI 탐색"
                    : "규칙 기반 무료 탐색"}
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
                <p>조건을 정리하고 근거가 있는 후보를 비교하고 있습니다.</p>
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

        <section className="result-section" id="assets">
          <div className="section-head">
            <div>
              <p className="section-kicker">CAMBODIA · PHNOM PENH</p>
              <h2>추천 자산</h2>
              <span>{visibleAssets.length}개 후보를 비교 중입니다.</span>
            </div>
            <div className="segmented" aria-label="자산 필터">
              {[
                ["all", "전체"],
                ["sale", "매매"],
                ["rent", "임대"],
                ["direct", "GLI Direct"],
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
                      <span>{asset.transaction === "sale" ? "매매" : "임대"}</span>
                      {asset.isGliDirect && <strong>GLI DIRECT</strong>}
                    </div>
                  </div>
                  <div className="asset-card-body">
                    <p className="asset-location">
                      <MapPin size={14} /> {asset.district}, {asset.city}
                    </p>
                    <h3>{asset.title}</h3>
                    <p className="asset-spec">
                      {asset.areaSqm}㎡ · {asset.bedrooms || "Studio"}BR · {asset.bathrooms}Bath
                    </p>
                    {"matchReasons" in asset && Array.isArray(asset.matchReasons) && (
                      <div className="reason-row">
                        {(asset.matchReasons as string[]).map((reason) => (
                          <span key={reason}>{reason}</span>
                        ))}
                      </div>
                    )}
                    <div className="asset-card-foot">
                      <div>
                        <small>{asset.transaction === "rent" ? "월 임대료" : "매매가"}</small>
                        <strong>${asset.price.toLocaleString("en-US")}</strong>
                      </div>
                      <div className={`trust-pill status-${asset.trustStatus.toLowerCase()}`}>
                        <ShieldCheck size={17} />
                        <span>
                          Trust <b>{asset.trustScore}</b>
                        </span>
                      </div>
                    </div>
                    <Link className="asset-link" href={`/assets/${asset.id}`}>
                      검증 요약 보기 <ArrowRight size={17} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <CircleAlert size={25} />
              <h3>현재 조건에 맞는 후보가 없습니다</h3>
              <p>예산이나 침실 수를 조금 넓혀 다시 질문해 보세요.</p>
            </div>
          )}
        </section>

        <section className="trust-band">
          <div>
            <p className="section-kicker">GLI TRUST STANDARD</p>
            <h2>점수보다 근거를 먼저 봅니다</h2>
            <p>
              Trust Score는 투자 수익률이 아니라 현재 자료의 완전성, 최신성, 일관성과 검토
              상태를 나타냅니다.
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
