import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bot,
  CheckCircle2,
  FileSearch,
  Globe2,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import type { Asset } from "../../lib/assets";
import { SiteFooter } from "./site-footer";

const trustTicker = [
  "자료 출처 확인",
  "가격·환율 정규화",
  "AI 위험 신호 탐지",
  "전문가 검토",
  "현지 조사 연계",
  "계약 추진 지원",
];

const voices = [
  {
    quote:
      "막연했던 해외 투자 조건을 질문 한 번으로 정리하고, 어떤 자료를 더 확인해야 하는지 바로 알 수 있었습니다.",
    name: "김민석",
    role: "Explorer 회원",
  },
  {
    quote:
      "가격보다 근거와 확인 단계를 함께 보여줘서 가족과 후보를 비교하기가 훨씬 수월했습니다.",
    name: "박지현",
    role: "Investor 회원",
  },
  {
    quote:
      "AI가 넓게 찾고 사람이 마지막 확인을 맡는 구조라 해외 자산을 검토할 때 신뢰가 생겼습니다.",
    name: "이정호",
    role: "Private 회원",
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

export function LandingPage({ assets }: { assets: Asset[] }) {
  const featured = [...assets]
    .sort((a, b) => b.trustScore - a.trustScore)
    .slice(0, 3);
  const heroAsset = featured[0];
  const countryCount = new Set(assets.map((asset) => asset.country)).size;
  const verifiedCount = assets.filter(
    (asset) => asset.isGliDirect || asset.trustScore >= 75,
  ).length;

  return (
    <>
      <main className="landing-page">
        <section className="landing-hero">
          <div className="landing-hero-glow" />
          <div className="landing-shell landing-hero-grid">
            <div className="landing-hero-copy">
              <p className="landing-kicker">
                <Sparkles size={16} /> GLOBAL LIFESTYLE INVESTMENT
              </p>
              <h1>
                더 넓게 발견하고,
                <br />더 깊게 검증하는 투자
              </h1>
              <p>
                국가와 자산의 경계를 넘어 GLI AI가 투자 후보를 탐색하고,
                전문가가 근거와 다음 확인 단계를 검토합니다.
              </p>
              <div className="landing-hero-actions">
                <Link className="lime-action" href="/explore#advisor">
                  자산 탐색 시작 <ArrowRight size={18} />
                </Link>
                <Link className="ghost-action" href="/#trust-system">
                  GLI 검증 체계
                </Link>
              </div>
              <dl className="landing-stats">
                <div>
                  <dt>{assets.length}+</dt>
                  <dd>검토 자산</dd>
                </div>
                <div>
                  <dt>{countryCount}개국</dt>
                  <dd>글로벌 탐색</dd>
                </div>
                <div>
                  <dt>{verifiedCount}</dt>
                  <dd>GLI 검증 후보</dd>
                </div>
              </dl>
            </div>

            {heroAsset ? (
              <Link className="landing-hero-card" href={`/assets/${heroAsset.id}`}>
                <div
                  className="landing-hero-card-image"
                  style={{ backgroundImage: `url("${heroAsset.image}")` }}
                >
                  <span>FEATURED ASSET</span>
                  <strong>
                    <ShieldCheck size={17} /> Trust {heroAsset.trustScore}
                  </strong>
                </div>
                <div className="landing-hero-card-body">
                  <p>
                    <MapPin size={15} /> {heroAsset.city}, {heroAsset.country}
                  </p>
                  <h2>{heroAsset.title}</h2>
                  <div>
                    <strong>{formatAssetPrice(heroAsset)}</strong>
                    <ArrowRight size={20} />
                  </div>
                </div>
              </Link>
            ) : null}
          </div>
        </section>

        <section className="trust-ticker" aria-label="GLI 검증 항목">
          <div>
            {[...trustTicker, ...trustTicker].map((item, index) => (
              <span key={`${item}-${index}`}>
                <CheckCircle2 size={15} /> {item}
              </span>
            ))}
          </div>
        </section>

        <section className="partner-strip">
          <div className="landing-shell">
            <span>GLOBAL NETWORK</span>
            <strong>DealFlow</strong>
            <strong>ERA Vietnam</strong>
            <strong>RLC Residences</strong>
            <strong>Seafood Club</strong>
            <strong>Solidnex</strong>
          </div>
        </section>

        <section className="landing-section" id="trust-system">
          <div className="landing-shell">
            <header className="landing-section-head">
              <p className="landing-kicker">HOW GLI WORKS</p>
              <h2>AI가 넓게 찾고, 전문가가 깊게 확인합니다</h2>
              <span>
                복잡한 해외 투자 탐색을 발견, 검토, 실행의 세 단계로 정리합니다.
              </span>
            </header>
            <div className="how-grid">
              <article>
                <span>01</span>
                <Search size={25} />
                <h3>글로벌 탐색</h3>
                <p>공개 정보와 GLI 파트너 자산을 질문의 조건에 맞춰 탐색합니다.</p>
              </article>
              <article>
                <span>02</span>
                <Bot size={25} />
                <h3>AI 교차 분석</h3>
                <p>가격, 자료 최신성, 일관성 및 위험 신호를 한 화면에 정리합니다.</p>
              </article>
              <article>
                <span>03</span>
                <UserCheck size={25} />
                <h3>전문가 확인</h3>
                <p>관심자산은 현지 조사와 계약 추진에 필요한 다음 단계로 연결합니다.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="inside-gli" id="about">
          <div className="landing-shell inside-gli-grid">
            <div>
              <p className="landing-kicker">INSIDE GLI</p>
              <h2>하나의 점수가 아니라, 확인의 흐름을 보여줍니다</h2>
              <p>
                GLI Trust Standard는 AI의 탐색 능력과 사람의 현장 판단을 결합합니다.
                사용자는 지금 확인된 근거와 앞으로 확인할 항목을 함께 볼 수 있습니다.
              </p>
              <Link className="text-action" href="/explore">
                GLI AI로 탐색하기 <ArrowRight size={17} />
              </Link>
            </div>
            <div className="inside-browser">
              <div className="inside-browser-bar">
                <i /> <i /> <i /> <span>GLI TRUST STANDARD</span>
              </div>
              <div className="inside-score-row">
                <div>
                  <small>GLI TRUST SCORE</small>
                  <strong>87</strong>
                  <span>/ 100</span>
                </div>
                <div>
                  <small>VERIFICATION</small>
                  <strong>92%</strong>
                  <span>전문가 검토 중</span>
                </div>
              </div>
              <div className="inside-progress">
                <span style={{ width: "92%" }} />
              </div>
              <div className="inside-checks">
                <p><BadgeCheck size={18} /> 출처 및 권리 자료 확인</p>
                <p><BarChart3 size={18} /> 시세·임대 조건 비교</p>
                <p><FileSearch size={18} /> 추가 실사 항목 정리</p>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section why-section">
          <div className="landing-shell">
            <header className="landing-section-head align-left">
              <p className="landing-kicker">WHY GLI</p>
              <h2>해외 투자 검토에 필요한 정보가 한곳에</h2>
            </header>
            <div className="why-grid">
              <article><Globe2 size={24} /><h3>국가 확장형</h3><p>캄보디아를 시작으로 베트남, 필리핀, 말레이시아와 글로벌 시장으로 확장합니다.</p></article>
              <article><MessageCircle size={24} /><h3>상담형 탐색</h3><p>정형 필터뿐 아니라 목적과 라이프스타일을 자연어로 이야기할 수 있습니다.</p></article>
              <article><ShieldCheck size={24} /><h3>근거 중심 검증</h3><p>자동 수집 매물과 GLI 추천 자산을 구분하고 확인 상태를 단계별로 보여줍니다.</p></article>
              <article><CheckCircle2 size={24} /><h3>실행까지 연결</h3><p>관심자산 저장에서 전문가 상담과 현지 실사까지 자연스럽게 이어집니다.</p></article>
            </div>
          </div>
        </section>

        <section className="landing-section featured-section">
          <div className="landing-shell">
            <header className="landing-section-head align-left with-action">
              <div>
                <p className="landing-kicker">FEATURED ASSETS</p>
                <h2>지금 살펴볼 투자 기회</h2>
              </div>
              <Link className="text-action" href="/explore">
                전체 자산 보기 <ArrowRight size={17} />
              </Link>
            </header>
            <div className="landing-asset-grid">
              {featured.map((asset) => (
                <Link className="landing-asset-card" href={`/assets/${asset.id}`} key={asset.id}>
                  <div
                    className="landing-asset-image"
                    style={{ backgroundImage: `url("${asset.image}")` }}
                  >
                    <span>{asset.originLabel ?? (asset.isGliDirect ? "GLI 검증" : asset.categoryLabel ?? "글로벌 자산")}</span>
                  </div>
                  <div>
                    <p><MapPin size={14} /> {asset.city}, {asset.country}</p>
                    <h3>{asset.title}</h3>
                    <footer>
                      <strong>{formatAssetPrice(asset)}</strong>
                      <span>Trust {asset.trustScore}</span>
                    </footer>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="founder-quote">
          <div className="landing-shell">
            <ShieldCheck size={34} />
            <blockquote>
              “좋은 투자 기회는 더 많은 정보를 보여주는 데서 끝나지 않습니다.
              AI가 찾아낸 가능성을 사람이 검증하고, 실제 행동으로 이어지게 해야 합니다.”
            </blockquote>
            <p>김세호 · GLI 대표</p>
          </div>
        </section>

        <section className="landing-section voice-section">
          <div className="landing-shell">
            <header className="landing-section-head">
              <p className="landing-kicker">MEMBER VOICES</p>
              <h2>투자 판단이 더 선명해지는 경험</h2>
            </header>
            <div className="voice-grid">
              {voices.map((voice) => (
                <article key={voice.name}>
                  <span>“</span>
                  <p>{voice.quote}</p>
                  <footer><strong>{voice.name}</strong><small>{voice.role}</small></footer>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section newsroom-section">
          <div className="landing-shell">
            <header className="landing-section-head align-left with-action">
              <div><p className="landing-kicker">NEWSROOM</p><h2>GLI의 최신 소식과 인사이트</h2></div>
              <Link className="text-action" href="/news">뉴스 전체보기 <ArrowRight size={17} /></Link>
            </header>
            <div className="landing-news-grid">
              <Link href="/news"><span>INSIGHT</span><h3>AI와 전문가 검토가 결합된 글로벌 자산 탐색의 새로운 기준</h3><p>2026. 8. 9.</p></Link>
              <Link href="/news"><span>PRESS</span><h3>GLI, 아시아 파트너 네트워크 기반 검증 자산 확대</h3><p>2026. 8. 2.</p></Link>
              <Link href="/news"><span>UPDATE</span><h3>GLI Cash와 단계별 자산 정보 이용 구조 공개</h3><p>2026. 7. 28.</p></Link>
            </div>
          </div>
        </section>

        <section className="landing-section faq-section">
          <div className="landing-shell faq-grid">
            <div><p className="landing-kicker">FAQ</p><h2>자주 묻는 질문</h2><p>GLI의 탐색과 검증 방식에 대해 확인하세요.</p></div>
            <div>
              <details><summary>GLI Trust Score는 수익률을 의미하나요?</summary><p>아닙니다. 자료의 완전성, 최신성, 일관성과 검토 진행 상태를 보여주는 지표입니다.</p></details>
              <details><summary>외부 포털 매물과 GLI 추천 자산은 어떻게 다른가요?</summary><p>외부 매물은 원문 출처를 표시하며, GLI 추천 자산은 파트너 또는 현지 네트워크를 통해 직접 확보한 기회입니다.</p></details>
              <details><summary>관심자산을 등록하면 무엇이 달라지나요?</summary><p>전문가 상담을 신청하고, 부족한 정보와 현지 확인 항목을 GLI 검토 흐름으로 연결할 수 있습니다.</p></details>
            </div>
          </div>
        </section>

        <section className="landing-final-cta">
          <div className="landing-shell">
            <p className="landing-kicker">START YOUR DISCOVERY</p>
            <h2>당신의 다음 투자 기회를 GLI AI와 찾아보세요</h2>
            <Link className="lime-action" href="/explore#advisor">
              자산 탐색 시작 <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
