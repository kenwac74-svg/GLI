"use client";

import { ArrowRight, BadgeCheck, Building2, CheckCircle2, CircleAlert, LoaderCircle, MapPin, Search, ShieldCheck, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import type { Asset } from "../../lib/assets";
import type { SearchResult } from "../../lib/search";

const prompts = ["프놈펜에 5,000만원으로 월세가 잘 나오는 투자가 가능할까?", "겨울마다 3개월 쉬고 부재 중 임대할 곳을 찾아줘", "월 500달러 이하 2베드 강 전망 임대 콘도"];

export function ExploreClient({ initialAssets }: { initialAssets: Asset[] }) {
  const [query, setQuery] = useState("");
  const [assets, setAssets] = useState(initialAssets);
  const [answer, setAnswer] = useState("찾으시는 목적과 예산을 편하게 말씀해 주세요. 조건을 정리해 검토할 후보와 확인할 위험을 함께 보여드립니다.");
  const [clarification, setClarification] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "sale" | "rent" | "direct">("all");
  const visibleAssets = useMemo(() => assets.filter((asset) => filter === "all" || (filter === "direct" ? asset.isGliDirect : asset.transaction === filter)), [assets, filter]);

  async function runSearch(value: string) {
    const clean = value.trim(); if (!clean) return; setLoading(true);
    try {
      const response = await fetch("/api/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: clean }) });
      if (!response.ok) throw new Error("search_failed");
      const result = await response.json() as SearchResult;
      setAssets(result.matches); setAnswer(result.answer); setClarification(result.clarification); setFilter("all");
    } catch { setAnswer("검색을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요."); setClarification(null); }
    finally { setLoading(false); }
  }
  function submit(event: FormEvent) { event.preventDefault(); void runSearch(query); }

  return <>
    <section className="explore-hero"><div className="hero-scrim" /><div className="hero-content">
      <p className="eyebrow"><Sparkles size={15} /> GLI AI PROPERTY ADVISOR</p><h1>캄보디아 부동산, 질문부터 시작하세요</h1><p className="hero-copy">예산과 삶의 방식을 이야기하면 GLI가 후보를 찾고, 자료 신뢰도와 다음 확인 단계를 한 번에 정리합니다.</p>
      <form className="search-composer" onSubmit={submit}><label htmlFor="asset-query">어떤 부동산을 찾고 계세요?</label><div className="composer-row"><textarea id="asset-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="예: 프놈펜에 5,000만원 정도로 월세가 잘 나오는 투자를 할 수 있을까?" rows={3} /><button type="submit" disabled={loading} aria-label="AI 검색 실행">{loading ? <LoaderCircle className="spin" size={22} /> : <Search size={22} />}<span>탐색</span></button></div>
      <div className="prompt-row" aria-label="예시 질문">{prompts.map((prompt) => <button type="button" key={prompt} onClick={() => { setQuery(prompt); void runSearch(prompt); }}>{prompt}</button>)}</div></form>
    </div></section>
    <main className="explore-main"><section className="advisor-response" aria-live="polite"><div className="advisor-icon"><Sparkles size={22} /></div><div><span>GLI AI 답변</span><p>{answer}</p>{clarification && <button onClick={() => setQuery(clarification)}>{clarification}</button>}</div></section>
    <section className="result-section" id="assets"><div className="section-head"><div><p className="section-kicker">CAMBODIA · PHNOM PENH</p><h2>추천 자산</h2><span>{visibleAssets.length}개 후보를 비교 중입니다.</span></div><div className="segmented" aria-label="자산 필터">{[["all","전체"],["sale","매매"],["rent","임대"],["direct","GLI Direct"]].map(([value,label]) => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value as typeof filter)}>{label}</button>)}</div></div>
    {visibleAssets.length ? <div className="asset-grid">{visibleAssets.map((asset) => <article className="asset-card" key={asset.id}><div className="asset-photo"><Image src={asset.image} alt={`${asset.title} 내부 또는 건물 이미지`} fill sizes="(max-width: 680px) 100vw, (max-width: 960px) 50vw, 33vw" unoptimized /><div className="asset-badges"><span>{asset.transaction === "sale" ? "매매" : "임대"}</span>{asset.isGliDirect && <strong>GLI DIRECT</strong>}</div></div><div className="asset-card-body">
      <p className="asset-location"><MapPin size={14} /> {asset.district}, {asset.city}</p><h3>{asset.title}</h3><p className="asset-spec">{asset.areaSqm}㎡ · {asset.bedrooms || "Studio"}BR · {asset.bathrooms}Bath</p>
      {"matchReasons" in asset && Array.isArray(asset.matchReasons) && <div className="reason-row">{(asset.matchReasons as string[]).map((reason) => <span key={reason}>{reason}</span>)}</div>}
      <div className="asset-card-foot"><div><small>{asset.transaction === "rent" ? "월 임대료" : "매매가"}</small><strong>${asset.price.toLocaleString("en-US")}</strong></div><div className={`trust-pill status-${asset.trustStatus.toLowerCase()}`}><ShieldCheck size={17} /><span>Trust <b>{asset.trustScore}</b></span></div></div><Link className="asset-link" href={`/assets/${asset.id}`}>검증 요약 보기 <ArrowRight size={17} /></Link>
    </div></article>)}</div> : <div className="empty-state"><CircleAlert size={25} /><h3>현재 조건에 맞는 후보가 없습니다</h3><p>예산이나 침실 수를 조금 넓혀 다시 질문해 보세요.</p></div>}</section>
    <section className="trust-band"><div><p className="section-kicker">GLI TRUST STANDARD</p><h2>점수보다 근거를 먼저 봅니다</h2><p>Trust Score는 투자 수익률이 아니라 현재 자료의 완전성, 최신성, 일관성과 검토 상태를 나타냅니다.</p></div><div className="trust-steps"><div><Building2 size={22} /><strong>표준화</strong><span>가격·면적·위치 통합</span></div><div><BadgeCheck size={22} /><strong>근거 평가</strong><span>최신성과 자료 일치 확인</span></div><div><CheckCircle2 size={22} /><strong>사람 검토</strong><span>고급 리포트 별도 승인</span></div></div></section>
    </main>
  </>;
}
