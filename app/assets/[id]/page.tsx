import {
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  MapPin,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
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

export const dynamic = "force-dynamic";

export default async function AssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { asset } = await getAsset(id);
  if (!asset) notFound();
  const currentUser = await getCurrentUser();
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
  const detailFacts = (asset.detailFacts ?? [
    {
      label: "면적",
      value: asset.areaSqm ? `${asset.areaSqm}㎡` : "조사 예정",
    },
    {
      label: "침실",
      value: asset.bedrooms ? String(asset.bedrooms) : "Studio",
    },
    {
      label: "욕실",
      value: asset.bathrooms ? String(asset.bathrooms) : "조사 예정",
    },
    {
      label: "마지막 자료 갱신",
      value: new Date(asset.updatedAt).toLocaleDateString("ko-KR"),
    },
  ]).filter((fact) => fact.label !== "자료 기준");

  return (
    <>
      <SiteHeader />
      <main className="detail-page">
        <div className="detail-layout">
          <section className="detail-primary">
            <AssetGallery
              title={asset.title}
              images={asset.images ?? [asset.image]}
              badges={[
                asset.originLabel ?? (asset.isGliDirect
                  ? "GLI 추천"
                  : hasExternalSource
                    ? "MARKET DATA"
                    : "REFERENCE DATA"),
                categoryLabel,
                ...(hasExternalSource && asset.sourceName ? [asset.sourceName] : []),
              ]}
            />
            <div className="detail-title">
              <p>
                <MapPin size={15} /> {asset.district}, {asset.city}, {asset.country}
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
            </section>
          </section>

          <AssetAccessDemo
            assetTitle={asset.title}
            trustScore={asset.trustScore}
            initialUnlockedLevel={membershipAccess.includedAssetTierLevel}
            membershipPlanId={membershipAccess.planId}
            publicResources={asset.publicResources ?? []}
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
