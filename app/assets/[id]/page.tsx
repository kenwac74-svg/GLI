import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  MapPin,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "../../components/site-header";
import { getAsset } from "../../../lib/assets-data";
import { AssetActions } from "./asset-actions";
import { AssetAccessDemo } from "./asset-access-demo";

export const dynamic = "force-dynamic";

export default async function AssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { asset } = await getAsset(id);
  if (!asset) notFound();

  return (
    <>
      <SiteHeader />
      <main className="detail-page">
        <Link className="back-link" href="/">
          <ArrowLeft size={17} /> 탐색 결과로
        </Link>
        <div className="detail-layout">
          <section className="detail-primary">
            <div className="detail-image">
              <Image
                src={asset.image}
                alt={`${asset.title} 이미지`}
                fill
                sizes="(max-width: 960px) 100vw, 820px"
                unoptimized
              />
              <div className="asset-origin-badges">
                <span>{asset.isGliDirect ? "GLI DIRECT" : "MARKET DATA"}</span>
                {asset.isGliDirect ? <span>GLI 검증 후보</span> : null}
              </div>
            </div>
            <div className="detail-title">
              <p>
                <MapPin size={15} /> {asset.district}, {asset.city}, {asset.country}
              </p>
              <h1>{asset.title}</h1>
              <div className="detail-price">
                <strong>${asset.price.toLocaleString("en-US")}</strong>
                <span>{asset.transaction === "rent" ? "월 임대료" : "매매가"}</span>
              </div>
            </div>
            <div className="detail-facts">
              <div>
                <span>면적</span>
                <strong>{asset.areaSqm}㎡</strong>
              </div>
              <div>
                <span>침실</span>
                <strong>{asset.bedrooms || "Studio"}</strong>
              </div>
              <div>
                <span>욕실</span>
                <strong>{asset.bathrooms}</strong>
              </div>
              <div>
                <span>마지막 자료 갱신</span>
                <strong>{new Date(asset.updatedAt).toLocaleDateString("ko-KR")}</strong>
              </div>
            </div>
            {!asset.isGliDirect && asset.sourceName && asset.sourceUrl ? (
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
            <section className="content-section">
              <h2>자산 요약</h2>
              <p>{asset.summary}</p>
            </section>
            <section className="content-section two-column-list">
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
            </section>
            <section className="content-section detail-service-actions">
              <div>
                <span>이 자산을 계속 검토하시겠습니까?</span>
                <strong>관심 자산에 저장하거나 GLI 전문가에게 문의하세요.</strong>
              </div>
              <div>
                <Link className="primary-action" href={`/my?consult=${asset.id}`}>
                  전문가 상담 신청
                </Link>
                <AssetActions assetId={asset.id} />
              </div>
            </section>
          </section>

          <AssetAccessDemo assetTitle={asset.title} trustScore={asset.trustScore} />
        </div>
      </main>
    </>
  );
}
