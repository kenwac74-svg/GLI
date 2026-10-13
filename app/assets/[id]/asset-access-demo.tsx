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
import { trustGrade } from "../../../lib/consultation-view";
import { canPreviewTier } from "../../../lib/access-preview";
import { AccessPreviewDialog } from "../../components/access-preview-dialog";

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

export function AssetAccessDemo({
  assetTitle,
  trustScore,
  initialUnlockedLevel,
  publicResources,
  externalSource = false,
}: {
  assetTitle: string;
  trustScore: number;
  initialUnlockedLevel: 1 | 2 | 3 | 4;
  membershipPlanId: MembershipPlanId | null;
  publicResources: AssetPublicResource[];
  externalSource?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<AccessTierId>("free");
  const [previewLevel, setPreviewLevel] = useState<number>(initialUnlockedLevel);
  const cashBalance = 5000;
  const [pendingId, setPendingId] = useState<AccessTierId | null>(null);

  const selected = TIERS.find((tier) => tier.id === selectedId) ?? TIERS[0];
  const pending = TIERS.find((tier) => tier.id === pendingId) ?? null;
  const hasAccess = selected.level <= previewLevel;
  const hasPreview = canPreviewTier(externalSource, publicResources.length, selected.level - 1);

  const accessLabel = useMemo(() => {
    const active = TIERS.filter((tier) => tier.level <= initialUnlockedLevel).at(-1);
    return active?.name ?? "FREE";
  }, [initialUnlockedLevel]);

  function confirmDemoAccess() {
    if (!pending) return;
    if (!canPreviewTier(externalSource, publicResources.length, pending.level - 1)) return;
    setPreviewLevel((level) => Math.max(level, pending.level));
    setPendingId(null);
  }

  return (
    <aside className="asset-access-demo" aria-label="자산 등급별 정보">
      <div className="access-demo-metrics">
        <div>
          <span>GLI TRUST GRADE</span>
          <strong>{trustGrade(trustScore)}</strong>
          <small>검증 등급</small>
        </div>
        <div>
          <span>검증 진행 상태</span>
          <strong>조사 예정</strong>
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
            {tier.level <= previewLevel ? <Check size={13} aria-label="열림" /> : null}
          </button>
        ))}
      </div>

      <div className="access-tier-body" role="tabpanel">
        <div className="access-tier-heading">
          <div>
            <span style={{ color: selected.color }}>{externalSource ? "출처 정보" : selected.eyebrow}</span>
            <h2>{externalSource ? "확보된 자산 자료" : tierTitle(selected.id)}</h2>
          </div>
          <span className={hasAccess ? "access-state is-open" : "access-state"}>
            {!hasPreview ? "추가 자료 없음" : hasAccess ? "열람 가능" : "열람 전"}
          </span>
        </div>

        {selected.id === "free" ? <FreePreview publicResources={publicResources} externalSource={externalSource} /> : null}
        {!externalSource && hasAccess && selected.id === "basic" ? <BasicPreview /> : null}
        {!externalSource && hasAccess && selected.id === "standard" ? <StandardPreview /> : null}
        {!externalSource && hasAccess && selected.id === "premium" ? <PremiumPreview /> : null}
        {!externalSource && hasAccess && selected.id === "business" ? <BusinessPreview assetTitle={assetTitle} /> : null}
        {externalSource && selected.id !== "free" ? <section className="tier-feature-panel">
          <h3>확보된 관련 자료</h3>
          {hasPreview ? hasAccess ? publicResources.map(resource=><p key={resource.url}><a href={resource.url} target="_blank" rel="noopener noreferrer">{resource.label}</a></p>)
            : <p>수집된 출처 자료를 확인할 수 있습니다.</p>
            : <p>현재 제공할 추가 자료가 없습니다. 기본 정보와 원문을 먼저 확인해 주세요.</p>}
        </section> : null}

        {!hasAccess && hasPreview ? (
          <div className="access-lock-copy">
            <LockKeyhole size={17} />
            <p>
              {selected.name}의 준비된 정보를 확인합니다.
            </p>
          </div>
        ) : null}
      </div>

      <div className="access-purchase-bar">
        <div>
          <span>현재 이용 등급</span>
          <strong>{accessLabel}</strong>
        </div>
        {!externalSource && <div>
          <span>GLI Cash</span>
          <strong>{cashBalance.toLocaleString("en-US")}</strong>
        </div>}
        {hasAccess ? (
          <button type="button" disabled>
            <Check size={17} /> 현재 열람 가능
          </button>
        ) : (
          <button
            type="button"
            disabled={!hasPreview}
            onClick={() => setPendingId(selected.id)}
          >
            {hasPreview ? `${selected.name} 정보 확인` : "추가 자료 없음"}
            <ChevronRight size={17} />
          </button>
        )}
      </div>
      <p className="access-policy-note">
        상위 등급은 모든 하위 등급을 포함합니다. 표시 정보는 검토 단계이며 확정된
        수익이나 법률 판단을 의미하지 않습니다.
      </p>

      {pending ? <AccessPreviewDialog tier={pending.name} title={assetTitle} onClose={()=>setPendingId(null)} onConfirm={confirmDemoAccess} /> : null}
    </aside>
  );
}

function FreePreview({
  publicResources,
  externalSource,
}: {
  publicResources: AssetPublicResource[];
  externalSource: boolean;
}) {
  return (
    <div className="tier-preview-stack">
      {!externalSource && <section className="tier-feature-panel">
        <h3>
          <BarChart3 size={18} /> 공개 시장 정보
        </h3>
        <div className="public-stat-grid">
          <div><span>지역 관심도</span><strong>{externalSource ? "미확인" : "상승"}</strong></div>
          <div><span>자료 최신성</span><strong>{externalSource ? "미확인" : "7일 이내"}</strong></div>
          <div><span>비교 후보</span><strong>{externalSource ? "미확인" : "12건"}</strong></div>
        </div>
      </section>}
      {!externalSource && <div className="tier-compact-row">
        <Map size={18} /><div><strong>위치 및 생활권</strong><span>지도 기반 입지 개요</span></div>
      </div>}
      {!externalSource && <div className="tier-compact-row">
        <Newspaper size={18} /><div><strong>공개 미디어</strong><span>관련 보도 및 공개 자료</span></div>
      </div>}
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
