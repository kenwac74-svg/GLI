import {
  ArrowRight,
  BadgeCheck,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { Asset } from "../../lib/assets";
import { newsItems } from "../../lib/news";
import { SiteFooter } from "./site-footer";

const partners = [
  "DealFlow",
  "Seafood Club",
  "ERA Vietnam",
  "RLC Residences",
  "㈜솔리드넥스",
];

const voices = [
  {
    quote:
      "프놈펜 매물을 직접 보러 가기 전에 서류가 어디까지 확인됐는지 알 수 있어서 출장 일정을 줄였습니다.",
    initial: "김",
    name: "김○○",
    meta: "Investor 플랜 · 서울",
  },
  {
    quote:
      "조건을 문장으로 적으면 후보가 이유와 함께 나오는 게 좋았습니다. 무엇을 더 확인해야 하는지까지 알려줍니다.",
    initial: "이",
    name: "이○○",
    meta: "Explorer 플랜 · 부산",
  },
  {
    quote:
      "프리미엄에서 본 현지 실사 자료가 기대보다 구체적이었습니다. 권리 관계 확인 부분이 가장 도움이 됐습니다.",
    initial: "박",
    name: "박○○",
    meta: "Private 플랜 · 인천",
  },
  {
    quote: "환율까지 함께 환산돼 나와서 한국 부동산과 비교하기가 편했습니다.",
    initial: "최",
    name: "최○○",
    meta: "Investor 플랜 · 대전",
  },
  {
    quote:
      "개발 프로젝트는 정보가 가장 부족한 분야인데, 시행사 자료 출처가 명시돼 있어 검토할 만했습니다.",
    initial: "정",
    name: "정○○",
    meta: "Private 플랜 · 서울",
  },
  {
    quote:
      "관심자산에 모아두고 한 번에 비교하는 방식이 실제 의사결정에 도움이 됩니다.",
    initial: "윤",
    name: "윤○○",
    meta: "Explorer 플랜 · 수원",
  },
];

const faqs = [
  {
    question: "GLI는 어떤 자산을 다루나요?",
    answer:
      "캄보디아·베트남·필리핀·말레이시아의 주거·상업·개발 프로젝트 자산을 다룹니다. 공개 시장 매물과 GLI가 직접 발굴한 파트너 자산을 함께 게재합니다.",
  },
  {
    question: "Trust Score는 어떻게 산출되나요?",
    answer:
      "AI 트랙이 공개 자료를 전수 수집해 기준을 정규화하고 항목 간 불일치를 찾아냅니다. 전문가 트랙은 원본 대조와 현지 실사를 거쳐 게재를 승인합니다. 80 이상 A, 65 이상 B, 그 외 C 등급입니다.",
  },
  {
    question: "열람 등급은 왜 나뉘어 있나요?",
    answer:
      "공개 자료와 현지 실사 자료는 확보 비용과 책임 범위가 다릅니다. LV.1 공개 정보는 무료이고, 상위 등급은 멤버십 또는 자산별 이용권으로 열람합니다.",
  },
  {
    question: "GLI가 직접 중개하나요?",
    answer:
      "GLI는 자료 검증과 현지 실행을 지원합니다. 거래 계약은 현지 법인·시행사와 진행되며, 자산별로 지원 범위를 안내합니다.",
  },
  {
    question: "게재 정보는 얼마나 자주 갱신되나요?",
    answer:
      "공개 자료는 수시로 수집하고, 파트너 자산은 원본 자료 갱신 시 반영합니다. 각 자산 상세에서 현재 확인된 정보와 추가 조사 항목을 구분해 안내합니다.",
  },
];

function formatAssetPrice(asset: Asset) {
  if (asset.priceLabel) return asset.priceLabel;
  if (!asset.price) return "조건 협의";
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: asset.currency,
    maximumFractionDigits: 0,
  });
  const value = formatter.format(asset.price);
  return asset.maxPrice ? `${value}~${formatter.format(asset.maxPrice)}` : value;
}

function trustGrade(score: number) {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  return "C";
}

function assetSpec(asset: Asset) {
  if (asset.cardMeta) return asset.cardMeta;
  const rooms = asset.bedrooms === 0 ? "스튜디오" : `${asset.bedrooms}BR`;
  const transaction = asset.transaction === "rent" ? "임대" : "매매";
  return `${rooms} · ${asset.areaSqm}m² · ${transaction}`;
}

export function LandingPage({ assets }: { assets: Asset[] }) {
  const featured = [...assets]
    .sort((a, b) => b.trustScore - a.trustScore)
    .slice(0, 3);
  const hero = featured[0];
  const heroBars = hero
    ? [
        { label: "자료 수집", value: 100 },
        { label: "기준 정규화", value: Math.min(100, hero.trustScore + 12) },
        { label: "원본 대조", value: hero.trustScore },
        { label: "현지 실사", value: Math.max(40, hero.trustScore - 14) },
      ]
    : [];

  return (
    <>
      <main className="claude-landing">
        <section className="cl-hero">
          <div className="cl-wrap cl-hero-inner">
            <div className="cl-hero-copy">
              <p className="cl-kicker">GLI AI INVESTMENT ADVISOR</p>
              <h1>
                국가와 자산의 경계를 넘어,
                <br />
                검증된 투자 기회를 탐색하세요
              </h1>
              <p className="cl-lead">
                예산과 투자 목적, 원하는 라이프스타일을 이야기하면 GLI가 적합한
                후보와 자료 신뢰도, 다음 확인 단계를 한 번에 정리합니다.
              </p>
              <div className="cl-stats">
                <div>
                  <b>{assets.length}</b>
                  <span>검증을 마친 기회</span>
                </div>
                <div>
                  <b>{assets.filter((asset) => asset.isGliDirect).length}</b>
                  <span>GLI 직접 실사</span>
                </div>
                <div>
                  <b>4개국</b>
                  <span>진출 시장</span>
                </div>
              </div>
              <div className="cl-actions">
                <Link className="cl-btn cl-btn-primary" href="/explore#advisor">
                  투자 기회 탐색하기 <ArrowRight size={17} />
                </Link>
                <Link className="cl-btn cl-btn-ghost" href="/#trust-system">
                  GLI 검증 방식
                </Link>
              </div>
            </div>

            {hero ? (
              <Link className="cl-hero-card" href={`/assets/${hero.id}`}>
                <div
                  className="cl-hero-card-image"
                  style={{ backgroundImage: `url("${hero.image}")` }}
                  role="img"
                  aria-label={`${hero.title} 사진`}
                >
                  <span className="cl-hero-pill">
                    <ShieldCheck size={15} />
                    {hero.originLabel || (hero.isGliDirect ? "GLI 검증" : "GLI 검증")}
                  </span>
                </div>
                <div className="cl-hero-card-body">
                  <span className="cl-label">GLI TRUST SCORE</span>
                  <div className="cl-score-line">
                    <strong>{hero.trustScore}</strong>
                    <span>/ 100 · {trustGrade(hero.trustScore)}등급</span>
                    <b>+3.2</b>
                  </div>
                  <p>{hero.title}</p>
                  <div className="cl-bars">
                    {heroBars.map((bar) => (
                      <div key={bar.label}>
                        <span>{bar.label}</span>
                        <i><b style={{ width: `${bar.value}%` }} /></i>
                        <strong>{bar.value}%</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </Link>
            ) : null}
          </div>
        </section>

        <section className="cl-ticker" aria-label="게재 자산 Trust Score">
          <div className="cl-ticker-track">
            {[...assets, ...assets].map((asset, index) => (
              <Link href={`/assets/${asset.id}`} className="cl-ticker-item" key={`${asset.id}-${index}`}>
                <i style={{ backgroundImage: `url("${asset.image}")` }} />
                {asset.title}
                <b>{asset.trustScore}</b>
                <span>{trustGrade(asset.trustScore)}등급</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="cl-partners">
          <div className="cl-wrap cl-partners-inner" aria-label="협력 파트너">
            <span>PARTNERS</span>
            {partners.map((partner) => <strong key={partner}>{partner}</strong>)}
          </div>
        </section>

        <section className="cl-section" id="trust-system">
          <div className="cl-wrap">
            <p className="cl-kicker cl-kicker-green">HOW IT WORKS</p>
            <h2>조건을 말하면 근거까지 확인합니다</h2>
            <div className="cl-steps">
              <article>
                <span>1</span>
                <h3>원하는 조건을 말합니다</h3>
                <p>국가·예산·목적을 문장으로 적으면 AI가 조건으로 분해합니다.</p>
              </article>
              <article>
                <span>2</span>
                <h3>후보를 순위로 정리합니다</h3>
                <p>게재 자산을 조건별로 점수화해 순위와 선정 이유를 함께 보여줍니다.</p>
              </article>
              <article>
                <span>3</span>
                <h3>검증 근거를 확인합니다</h3>
                <p>Trust Score와 근거 자료, 현지 실사 결과를 등급에 따라 열람합니다.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="cl-inside" id="about">
          <div className="cl-wrap cl-inside-inner">
            <p className="cl-kicker">INSIDE GLI</p>
            <h2>화면으로 보는 GLI</h2>
            <div className="cl-showcase">
              <article className="cl-show">
                <div>
                  <span className="cl-show-number">1</span>
                  <h3>문장으로 묻고, 조건으로 받습니다</h3>
                  <p>예산·지역·목적을 그대로 적으면 AI가 검색 조건으로 분해합니다. 어떤 기준으로 찾았는지도 함께 보여줍니다.</p>
                </div>
                <div className="cl-ui">
                  <div className="cl-ui-bar"><i /><i /><i /><span>GLI AI Search</span></div>
                  <div className="cl-ui-body">
                    <div className="cl-query">프놈펜에 5,000만원 정도로 월세가 잘 나오는 투자를 할 수 있을까?</div>
                    <div className="cl-ai-tags"><span>캄보디아</span><span>매매</span><span>예산 5,000만원</span><span>임대수익</span></div>
                    <p className="cl-ai-result"><Sparkles size={16} /> 후보 8건을 근거 기준으로 정렬했습니다</p>
                  </div>
                </div>
              </article>

              <article className="cl-show">
                <div>
                  <span className="cl-show-number">2</span>
                  <h3>등급마다 어디까지 확인됐는지 알 수 있습니다</h3>
                  <p>공개 자료부터 현지 실사 결과까지 5단계로 나눠 공개합니다. 잠긴 항목도 무엇인지는 먼저 보여드립니다.</p>
                </div>
                <div className="cl-ui">
                  <div className="cl-ui-bar"><i /><i /><i /><span>Trust Report</span></div>
                  <div className="cl-ui-body">
                    <div className="cl-demo-score"><strong>87</strong><span>/ 100 · A등급</span><b>열람 가능</b></div>
                    <div className="cl-bars">
                      <div><span>권리 자료</span><i><b style={{ width: "92%" }} /></i><strong>92%</strong></div>
                      <div><span>시세 근거</span><i><b style={{ width: "78%" }} /></i><strong>78%</strong></div>
                      <div><span>현지 실사</span><i><b style={{ width: "64%" }} /></i><strong>64%</strong></div>
                    </div>
                  </div>
                </div>
              </article>

              <article className="cl-show">
                <div>
                  <span className="cl-show-number">3</span>
                  <h3>관심 자산을 나란히 두고 비교합니다</h3>
                  <p>가격과 Trust Score, 확인된 항목을 한 화면에서 비교하고 변동 사항을 받아볼 수 있습니다.</p>
                </div>
                <div className="cl-ui">
                  <div className="cl-ui-bar"><i /><i /><i /><span>Watchlist</span></div>
                  <div className="cl-ui-body cl-watchlist">
                    {featured.map((asset) => (
                      <div key={asset.id}>
                        <i style={{ backgroundImage: `url("${asset.image}")` }} />
                        <span><strong>{asset.title}</strong><small>{formatAssetPrice(asset)}</small></span>
                        <b>{asset.trustScore}</b>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="cl-section">
          <div className="cl-wrap">
            <p className="cl-kicker cl-kicker-green">WHY GLI</p>
            <h2>해외 자산은 정보가 아니라 확인이 문제입니다</h2>
            <div className="cl-why">
              <article><MapPin size={26} /><h3>현지 실사</h3><p>베트남 법인과 현지 인력이 현장과 서류 원본을 직접 확인합니다.</p></article>
              <article><Search size={26} /><h3>AI 전수 수집</h3><p>공개 매물과 파트너 자료를 모아 기준을 맞추고 불일치를 찾아냅니다.</p></article>
              <article><ShieldCheck size={26} /><h3>등급별 열람</h3><p>공개 정보부터 현지 실사 자료까지 5단계로 나눠 제공합니다.</p></article>
              <article><BadgeCheck size={26} /><h3>특허 검증 기술</h3><p>플랫폼과 검증 기술은 ㈜솔리드넥스가 개발하고 관련 특허를 보유합니다.</p></article>
            </div>
          </div>
        </section>

        <section className="cl-section">
          <div className="cl-wrap">
            <header className="cl-section-heading">
              <div><p className="cl-kicker cl-kicker-green">FEATURED</p><h2>Trust Score 상위 자산</h2></div>
              <Link className="cl-btn cl-btn-outline" href="/explore">전체 자산 보기 <ArrowRight size={17} /></Link>
            </header>
            <div className="cl-asset-grid">
              {featured.map((asset) => (
                <Link className="cl-asset-card" href={`/assets/${asset.id}`} key={asset.id}>
                  <div className="cl-asset-photo">
                    <div className="cl-tag-stack">
                      {asset.originLabel || asset.isGliDirect ? <span className="cl-tag-verified">{asset.originLabel || "GLI 검증"}</span> : null}
                      <span>{asset.transaction === "rent" ? "임대" : "매매"}</span>
                    </div>
                    <div style={{ backgroundImage: `url("${asset.image}")` }} />
                  </div>
                  <div className="cl-asset-body">
                    <p className="cl-location"><MapPin size={15} /> {asset.city}, {asset.country}</p>
                    <h3>{asset.title}</h3>
                    <div className="cl-asset-numbers">
                      <div><small>{asset.offerLabel || "표시 가격"}</small><strong>{formatAssetPrice(asset)}</strong></div>
                      <span>Trust <b>{asset.trustScore}</b><i>{trustGrade(asset.trustScore)}</i></span>
                    </div>
                    <p className="cl-asset-spec">{assetSpec(asset)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="cl-quote-band">
          <div className="cl-wrap cl-quote-inner">
            <span className="cl-quote-avatar">김</span>
            <div>
              <blockquote>“해외 투자에서 어려운 건 좋은 자산을 찾는 일이 아니라, 무엇을 믿을 수 있는지 판단하는 일입니다. GLI는 그 판단의 근거를 만듭니다.”</blockquote>
              <p><strong>김세호</strong> · GLI 대표이사 · 글로벌 사업총괄</p>
            </div>
          </div>
        </section>

        <section className="cl-section">
          <div className="cl-wrap">
            <p className="cl-kicker cl-kicker-green">MEMBER VOICES</p>
            <h2>회원들의 이용 후기</h2>
            <div className="cl-voice-marquee">
              <div className="cl-voice-track">
                {[...voices, ...voices].map((voice, index) => (
                  <figure key={`${voice.name}-${index}`}>
                    <blockquote>{voice.quote}</blockquote>
                    <figcaption><span>{voice.initial}</span><p><strong>{voice.name}</strong><small>{voice.meta}</small></p></figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="cl-section">
          <div className="cl-wrap">
            <header className="cl-section-heading">
              <div><p className="cl-kicker cl-kicker-green">NEWSROOM</p><h2>GLI 소식</h2></div>
              <Link className="cl-btn cl-btn-outline" href="/news">전체 보기</Link>
            </header>
            <div className="cl-news-grid">
              {newsItems.slice(0, 3).map((item) => (
                <Link href={`/news/${item.id}`} key={item.id}>
                  <span className="cl-news-image" style={{ backgroundImage: `url("${item.image}")` }}><b>{item.category}</b></span>
                  <span><strong>{item.title}</strong><small>{item.date}</small></span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="cl-section">
          <div className="cl-wrap">
            <p className="cl-kicker cl-kicker-green">FAQ</p>
            <h2>자주 묻는 질문</h2>
            <div className="cl-faq">
              {faqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}
            </div>
          </div>
        </section>

        <section className="cl-cta-section">
          <div className="cl-wrap">
            <div className="cl-cta">
              <div><h2>어떤 자산을 찾고 계신가요?</h2><p>조건을 문장으로 적으면 검토할 후보와 확인해야 할 위험을 함께 정리해 드립니다.</p></div>
              <Link className="cl-btn cl-btn-primary" href="/explore#advisor">자산 탐색 시작 <ArrowRight size={17} /></Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
