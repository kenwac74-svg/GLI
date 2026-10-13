import {
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  MapPin,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { uiLocale, UI_LOCALE_COOKIE } from "../../../lib/ui-language";
import { SiteHeader } from "../../components/site-header";
import { PriceDisplay } from "../../components/price-display";
import { AssetGallery } from "./asset-gallery";
import { getCurrentUser } from "../../auth";
import { getMembershipAccess } from "../../../db/membership-entitlements.ts";
import { getAsset } from "../../../lib/assets-data";
import { ensureMemberContext } from "../../../lib/member-data";
import { getMembershipEntitlements } from "../../../lib/membership-plans.ts";
import { AssetActions } from "./asset-actions";
import { AssetAccessDemo } from "./asset-access-demo";
import { BackToResultsButton } from "./back-to-results-button";
import { ClaudeDesignShell } from "../../components/claude-design-shell";
import { CLAUDE_ASSET_IDS } from "../../generated/claude-static";
import { localizeAssets } from "../../../lib/asset-localization";
import { candidateLocation } from "../../../lib/location-display";
import { basicDetailFacts } from "../../../lib/asset-basic-info";
import { createD1AssetFavoritesRepository } from "../../../db/asset-favorites-repository";
import { createD1AssetReferenceRepository } from "../../../db/asset-reference-repository";

export const dynamic = "force-dynamic";

export default async function AssetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ origin?: string }>;
}) {
  const { id } = await params;
  const origin = (await searchParams)?.origin;
  // C1: search IDs refer to canonical backend records, not the positional
  // Claude fixture with the same ID. Never accept property facts from the URL.
  if (origin !== "search" && (CLAUDE_ASSET_IDS as readonly string[]).includes(id)) {
    return <ClaudeDesignShell key={id} view="detail" assetId={id} />;
  }
  const currentUser = await getCurrentUser();
  let { asset: originalAsset } = await getAsset(id);
  if (!originalAsset && currentUser) {
    const context=await ensureMemberContext(currentUser);
    if (await createD1AssetFavoritesRepository(context.database).contains(context.workflowUser.id,id)) {
      originalAsset=(await createD1AssetReferenceRepository(context.database).get(id))?.asset ?? null;
    }
  }
  if (!originalAsset) notFound();
  const locale = uiLocale((await cookies()).get(UI_LOCALE_COOKIE)?.value);
  const [asset] = await localizeAssets([originalAsset], locale);
  let membershipAccess = getMembershipEntitlements(null);
  if (currentUser) {
    const context = await ensureMemberContext(currentUser);
    membershipAccess = await getMembershipAccess(
      context.database,
      context.workflowUser.id,
    );
  }
  const hasExternalSource = Boolean(
    !asset.isGliDirect && asset.sourceName && asset.sourceUrl,
  );
  const categoryLabel = asset.categoryLabel ?? "주거용";
  const detailFacts = basicDetailFacts(asset, locale);

  return (
    <>
      <SiteHeader />
      <main className="detail-page">
        <BackToResultsButton assetId={asset.id} />
        <div className="detail-layout">
          <section className="detail-primary">
            <AssetGallery
              title={asset.title}
              images={asset.images ?? [asset.image]}
              badges={[
                asset.originLabel ?? (asset.isGliDirect
                  ? "GLI 추천"
                  : hasExternalSource
                    ? "외부 수집 매물"
                    : "참고 자료"),
                categoryLabel,
                ...(hasExternalSource && asset.sourceName ? [asset.sourceName] : []),
              ]}
            />
            <div className="detail-title">
              <p>
                <MapPin size={15} /> {candidateLocation(asset, locale)}
              </p>
              <h1>{asset.title}</h1>
              <PriceDisplay
                className="detail-price price-display"
                amount={asset.price}
                maxAmount={asset.maxPrice}
                currency={asset.currency}
                contextLabel={
                  asset.offerLabel ??
                  (asset.transaction === "rent" ? "월 임대료" : "매매가")
                }
                originalLabel={asset.priceLabel}
                showAttribution
              />
            </div>
            <div className="detail-facts">
              {detailFacts.map((fact) => (
                <div key={fact.label}>
                  <span>{fact.label}</span>
                  <strong>{fact.value}</strong>
                </div>
              ))}
            </div>
            {hasExternalSource && asset.sourceName && asset.sourceUrl ? (
              <section className="asset-source" aria-label="외부 매물 출처">
                <div>
                  <span>매물 출처</span>
                  <strong>{asset.sourceName}</strong>
                </div>
                <a
                  href={asset.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  원문 매물 보기 <ExternalLink size={16} />
                </a>
              </section>
            ) : null}
            <section className="content-section asset-summary">
              <h2>자산 요약</h2>
              <p>{asset.summary}</p>
              {originalAsset.summary === originalAsset.title ? <p>별도 원문 설명 미확인</p> : null}
              {asset.translationStatus === "unavailable" ? <p>한국어 번역 캐시 미확인 · 원문이 포함되어 있습니다.</p> : null}
              {hasExternalSource ? <p>외부 출처 기재 내용이며 GLI 검증 완료를 뜻하지 않습니다.</p> : null}
            </section>
          </section>

          <AssetAccessDemo
            key={asset.id}
            assetTitle={asset.title}
            trustScore={asset.trustScore}
            initialUnlockedLevel={membershipAccess.includedAssetTierLevel}
            membershipPlanId={membershipAccess.planId}
            publicResources={asset.publicResources ?? []}
            externalSource={hasExternalSource}
          />

          <section className="detail-action-bar" aria-label="자산 검토와 상세 작업">
            <div className="detail-review-grid">
              <div>
                <h2>
                  <CheckCircle2 size={19} /> 검토 강점
                </h2>
                <ul>
                  {asset.strengths.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h2>
                  <CircleAlert size={19} /> 추가 확인
                </h2>
                <ul>
                  {asset.checks.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="detail-action-grid">
              <Link className="primary-action" href={`/my?consult=${asset.id}`}>
                <MessageCircle size={19} /> 전문가 상담 신청
              </Link>
              <div className="detail-favorite-action">
                <AssetActions assetId={asset.id} />
              </div>
              <BackToResultsButton assetId={asset.id} />
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
