import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  CircleAlert,
  FileCheck2,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "../../components/site-header";
import { getAsset } from "../../../lib/assets-data";
import { AssetActions } from "./asset-actions";

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
              {asset.isGliDirect && <span>GLI DIRECT</span>}
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
          </section>

          <aside className="trust-panel">
            <div className="trust-panel-head">
              <span>GLI TRUST SCORE</span>
              <strong>{asset.trustScore}</strong>
              <small>100점 만점</small>
            </div>
            <div className="trust-meter">
              <span style={{ width: `${asset.trustScore}%` }} />
            </div>
            <div className="status-line">
              <ShieldCheck size={20} />
              <div>
                <strong>{statusLabel(asset.trustStatus)}</strong>
                <span>규칙 엔진 v0.1 · 사람 승인 전</span>
              </div>
            </div>
            <p className="trust-note">
              Trust Score는 현재 자료의 신뢰도를 나타내며, 수익률이나 법적 안전을 보장하지
              않습니다.
            </p>
            <div className="evidence-list">
              <div>
                <FileCheck2 size={18} />
                <span>기본 매물 자료</span>
                <b>확인</b>
              </div>
              <div>
                <FileCheck2 size={18} />
                <span>가격·면적 정규화</span>
                <b>확인</b>
              </div>
              <div className="pending">
                <CalendarCheck size={18} />
                <span>현장·권리 자료</span>
                <b>대기</b>
              </div>
            </div>
            <Link
              className="report-action"
              href={`/assets/${asset.id}/trust-report`}
            >
              <FileCheck2 size={18} />
              전체 Trust Report
            </Link>
            <Link className="primary-action" href={`/my?consult=${asset.id}`}>
              전문가 상담 신청
            </Link>
            <AssetActions assetId={asset.id} />
            {asset.isGliDirect && (
              <div className="direct-box">
                <strong>GLI Direct 실행 프로그램</strong>
                <p>현장 확인과 계약 추진 지원 범위는 상담 후 별도로 안내합니다.</p>
              </div>
            )}
          </aside>
        </div>
      </main>
    </>
  );
}

function statusLabel(status: string) {
  if (status === "VERIFIED") return "검증 완료";
  if (status === "REVIEWING") return "전문가 검토 대기";
  if (status === "NEEDS_ATTENTION") return "우선 확인 필요";
  return "예비 평가";
}

