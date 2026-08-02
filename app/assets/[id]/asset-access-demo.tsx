"use client";

import {
  BarChart3,
  Bot,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  ExternalLink,
  FileText,
  Globe2,
  Landmark,
  LockKeyhole,
  Map,
  Newspaper,
  Plane,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { MembershipPlanId } from "../../../lib/membership-plans";
import type { AssetPublicResource } from "../../../lib/assets";

type AccessTierId = "free" | "basic" | "standard" | "premium" | "business";

type TierDefinition = {
  id: AccessTierId;
  name: string;
  level: number;
  eyebrow: string;
  color: string;
};

const TIERS: readonly TierDefinition[] = [
  { id: "free", name: "FREE", level: 1, eyebrow: "공개 정보", color: "#88a0b7" },
  { id: "basic", name: "BASIC", level: 2, eyebrow: "AI 분석", color: "#3d8df5" },
  { id: "standard", name: "STANDARD", level: 3, eyebrow: "상세 리포트", color: "#9657f5" },
  { id: "premium", name: "PREMIUM", level: 4, eyebrow: "현지 검증", color: "#d99b1d" },
  { id: "business", name: "BUSINESS", level: 5, eyebrow: "실행 지원", color: "#c450ef" },
] as const;

const CASH_COST: Partial<Record<AccessTierId, number>> = {
  premium: 1200,
  business: 3500,
};

export function AssetAccessDemo({
  assetTitle,
  trustScore,
  initialUnlockedLevel,
  membershipPlanId,
  publicResources,
}: {
  assetTitle: string;
  trustScore: number;
  initialUnlockedLevel: 1 | 2 | 3 | 4;
  membershipPlanId: MembershipPlanId | null;
  publicResources: AssetPublicResource[];
}) {
  const [selectedId, setSelectedId] = useState<AccessTierId>("free");
  const [unlockedLevel, setUnlockedLevel] = useState(initialUnlockedLevel);
  const [cashBalance, setCashBalance] = useState(5000);
  const [pendingId, setPendingId] = useState<AccessTierId | null>(null);

  const selected = TIERS.find((tier) => tier.id === selectedId) ?? TIERS[0];
  const pending = TIERS.find((tier) => tier.id === pendingId) ?? null;
  const hasAccess = selected.level <= unlockedLevel;
  const cashCost = CASH_COST[selected.id];
  const canUseGliCash = membershipPlanId !== null;
  const standardPrice = unlockedLevel >= 2 ? 1 : 2.99;

  const accessLabel = useMemo(() => {
    const active = TIERS.filter((tier) => tier.level <= unlockedLevel).at(-1);
    return active?.name ?? "FREE";
  }, [unlockedLevel]);

  function confirmDemoAccess() {
    if (!pending) return;
    const cost = CASH_COST[pending.id] ?? 0;
    if (cost > cashBalance) return;
    setCashBalance((balance) => balance - cost);
    setUnlockedLevel((level) => Math.max(level, pending.level));
    setPendingId(null);
  }

  return (
    <aside className="asset-access-demo" aria-label="자산 등급별 정보">
      <div className="access-demo-metrics">
        <div>
          <span>GLI TRUST SCORE</span>
          <strong>{trustScore}</strong>
          <small>/ 100</small>
        </div>
        <div>
          <span>VERIFICATION PROGRESS</span>
          <strong>64</strong>
          <small>%</small>
        </div>
      </div>

      <div className="access-tier-tabs" role="tablist" aria-label="정보 등급">
        {TIERS.map((tier) => (
          <button
            key={tier.id}
            type="button"
            role="tab"
            aria-selected={selected.id === tier.id}
            className={selected.id === tier.id ? "is-active" : ""}
            style={{ "--tier-color": tier.color } as React.CSSProperties}
            onClick={() => setSelectedId(tier.id)}
          >
            <span>{tier.name}</span>
            <small>(LV.{tier.level})</small>
            {tier.level <= unlockedLevel ? <Check size={13} aria-label="열림" /> : null}
          </button>
        ))}
      </div>

      <div className="access-tier-body" role="tabpanel">
        <div className="access-tier-heading">
          <div>
            <span style={{ color: selected.color }}>{selected.eyebrow}</span>
            <h2>{tierTitle(selected.id)}</h2>
          </div>
          <span className={hasAccess ? "access-state is-open" : "access-state"}>
            {hasAccess ? "열람 가능" : "잠김"}
          </span>
        </div>

        {selected.id === "free" ? <FreePreview publicResources={publicResources} /> : null}
        {selected.id === "basic" ? <BasicPreview /> : null}
        {selected.id === "standard" ? <StandardPreview /> : null}
        {selected.id === "premium" ? <PremiumPreview /> : null}
        {selected.id === "business" ? <BusinessPreview assetTitle={assetTitle} /> : null}

        {!hasAccess ? (
          <div className="access-lock-copy">
            <LockKeyhole size={17} />
            <p>
              {selected.name}을 열면 LV.1부터 LV.{selected.level}까지 모두 이용할 수
              있습니다.
            </p>
          </div>
        ) : null}
      </div>

      <div className="access-purchase-bar">
        <div>
          <span>현재 이용 등급</span>
          <strong>{accessLabel}</strong>
        </div>
        <div>
          <span>GLI Cash</span>
          <strong>{cashBalance.toLocaleString("en-US")}</strong>
        </div>
        {hasAccess ? (
          <button type="button" disabled>
            <Check size={17} /> 현재 열람 가능
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (cashCost && !canUseGliCash) {
                window.location.assign("/membership");
                return;
              }
              setPendingId(selected.id);
            }}
          >
            {cashCost
              ? canUseGliCash
                ? `${cashCost.toLocaleString("en-US")} GLI Cash로 열기`
                : "멤버십 가입 후 GLI Cash 이용"
              : selected.id === "basic"
                ? "Explorer 월 $1.99로 시작"
                : `$${standardPrice.toFixed(2)}로 업그레이드`}
            <ChevronRight size={17} />
          </button>
        )}
      </div>
      <p className="access-policy-note">
        상위 등급은 모든 하위 등급을 포함합니다. 표시 정보는 검토 단계이며 확정된
        수익이나 법률 판단을 의미하지 않습니다.
      </p>

      {pending ? (
        <div className="access-demo-dialog" role="dialog" aria-modal="true">
          <div>
            <span>ASSET ACCESS</span>
            <h3>{pending.name} 이용 확인</h3>
            <p>
              이 등급과 모든 하위 등급의 이용 내용을 확인합니다.
            </p>
            <dl>
              <div>
                <dt>대상 자산</dt>
                <dd>{assetTitle}</dd>
              </div>
              <div>
                <dt>이용 방식</dt>
                <dd>{purchaseDescription(pending.id, unlockedLevel)}</dd>
              </div>
            </dl>
            <div className="access-dialog-actions">
              <button type="button" onClick={() => setPendingId(null)}>
                취소
              </button>
              <button type="button" onClick={confirmDemoAccess}>
                이용 확정
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function FreePreview({
  publicResources,
}: {
  publicResources: AssetPublicResource[];
}) {
  return (
    <div className="tier-preview-stack">
      <section className="tier-feature-panel">
        <h3>
          <BarChart3 size={18} /> 공개 시장 정보
        </h3>
        <div className="public-stat-grid">
          <div><span>지역 관심도</span><strong>상승</strong></div>
          <div><span>자료 최신성</span><strong>7일 이내</strong></div>
          <div><span>비교 후보</span><strong>12건</strong></div>
        </div>
      </section>
      <div className="tier-compact-row">
        <Map size={18} /><div><strong>위치 및 생활권</strong><span>지도 기반 입지 개요</span></div>
      </div>
      <div className="tier-compact-row">
        <Newspaper size={18} /><div><strong>공개 미디어</strong><span>관련 보도 및 공개 자료</span></div>
      </div>
      {publicResources.length ? (
        <section className="tier-public-resources" aria-label="공개 웹 자료">
          <h3><Globe2 size={18} /> 공개 웹 자료</h3>
          {publicResources.map((resource) => (
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              key={`${resource.type}-${resource.url}`}
            >
              <span>{resource.label}</span>
              <ExternalLink size={15} />
            </a>
          ))}
        </section>
      ) : null}
    </div>
  );
}

function BasicPreview() {
  return (
    <div className="tier-preview-stack">
      <section className="tier-feature-panel tier-blue">
        <h3><Bot size={18} /> AI RISK RADAR</h3>
        <div className="risk-bars">
          {[["시장성", 76], ["변동성", 48], ["유동성", 61], ["규제", 57], ["운영", 72]].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span><i><b style={{ width: `${value}%` }} /></i><strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>
      <div className="tier-insight"><ShieldCheck size={18} /><div><strong>AI 검토 요약</strong><p>입지와 공개자료는 긍정적이며 권리·운영 조건은 추가 확인이 필요합니다.</p></div></div>
    </div>
  );
}

function StandardPreview() {
  const documents = [
    "GLI Trust Report 요약",
    "권리·계약 검토 체크리스트",
    "운영비 및 현금흐름 시나리오",
    "비교 자산 분석 리포트",
  ];
  return (
    <section className="tier-feature-panel tier-purple">
      <h3><FileText size={18} /> 상세 분석 자료</h3>
      <div className="document-preview-list">
        {documents.map((document) => (
          <div key={document}><FileText size={17} /><span>{document}</span></div>
        ))}
      </div>
    </section>
  );
}

function PremiumPreview() {
  return (
    <div className="tier-preview-stack">
      <section className="tier-feature-panel tier-gold">
        <h3><Plane size={18} /> GLI FIELD SERVICES</h3>
        <div className="service-preview-list">
          <div><strong>현지 영상 브리핑</strong><span>담당자 촬영 및 현장 상태 기록</span></div>
          <div><strong>전문가 검토 의견</strong><span>권리·세무·운영 확인 항목 정리</span></div>
          <div><strong>방문 지원 패키지</strong><span>일정과 비용은 자산별 별도 안내</span></div>
        </div>
      </section>
      <p className="tier-demo-caption">서비스 범위와 이용 조건은 자산별로 안내합니다.</p>
    </div>
  );
}

function BusinessPreview({ assetTitle }: { assetTitle: string }) {
  return (
    <div className="tier-preview-stack">
      <section className="tier-feature-panel tier-business">
        <h3><BriefcaseBusiness size={18} /> GLI DEAL DESK</h3>
        <p>{assetTitle}의 사업자 연결과 거래 추진을 위한 전담 실행 창구입니다.</p>
        <div className="deal-desk-actions">
          <button type="button"><Landmark size={17} /> 사업자 미팅 요청</button>
          <button type="button"><Sparkles size={17} /> 협상 지원 요청</button>
        </div>
      </section>
      <p className="tier-demo-caption">계약·협상·전문가 용역은 추후 별도 범위와 조건으로 확정합니다.</p>
    </div>
  );
}

function tierTitle(id: AccessTierId) {
  if (id === "free") return "누구나 확인하는 기본 자산 정보";
  if (id === "basic") return "AI가 정리한 핵심 위험 신호";
  if (id === "standard") return "비교와 판단을 위한 상세 분석";
  if (id === "premium") return "자산별 현지 검증과 비공개 자료";
  return "거래 추진을 위한 GLI 실행 서비스";
}

function purchaseDescription(id: AccessTierId, unlockedLevel: number) {
  if (id === "basic") return "Basic 월 정기구독 · $1.99";
  if (id === "standard") {
    return unlockedLevel >= 2
      ? "Basic에서 Standard 차액 결제 · $1.00"
      : "Standard 월 정기구독 · $2.99";
  }
  return `${(CASH_COST[id] ?? 0).toLocaleString("en-US")} GLI Cash · 자산별 이용권`;
}
