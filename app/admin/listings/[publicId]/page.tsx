import {
  ArrowLeft,
  Database,
  ExternalLink,
  FileCheck2,
  Fingerprint,
  History,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getListingReviewDetail } from "../../../../db/operations";
import { ensureMemberContext } from "../../../../lib/member-data";
import { getCurrentUser } from "../../../auth";
import { SiteHeader } from "../../../components/site-header";
import { ListingReviewActions } from "../../admin-actions";

export const dynamic = "force-dynamic";

export default async function ListingReviewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const user = await getCurrentUser();
  const context = user ? await ensureMemberContext(user) : null;
  if (context?.workflowUser.role !== "ADMIN") redirect("/admin");

  const detail = await getListingReviewDetail(
    context.database,
    publicId,
    context.workflowUser.id,
  );
  if (!detail) notFound();

  const dimensions = detail.trust
    ? Object.entries(detail.trust.dimensions).slice(0, 12)
    : [];

  return (
    <>
      <SiteHeader />
      <main className="admin-page listing-review-page">
        <Link className="page-back-link" href="/admin">
          <ArrowLeft size={16} /> 운영센터
        </Link>

        <header className="listing-review-head">
          <div>
            <p className="section-kicker">LISTING DUE DILIGENCE</p>
            <h1>{detail.listing.title}</h1>
            <p>
              {detail.listing.publicId} ·{" "}
              {[detail.listing.district, detail.listing.city, detail.listing.country]
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>
          <span
            className={`listing-state state-${detail.listing.status.toLowerCase()}`}
          >
            {statusLabel(detail.listing.status)}
          </span>
        </header>

        <div className="listing-review-layout">
          <div className="listing-review-evidence">
            <section className="review-evidence-section">
              <div className="workflow-section-head">
                <div>
                  <span>PUBLIC FACTS</span>
                  <h2>공개 예정 정보</h2>
                </div>
                <FileCheck2 size={22} />
              </div>
              <p className="review-summary">{detail.listing.summary}</p>
              <dl className="review-fact-grid">
                <div>
                  <dt>거래</dt>
                  <dd>{detail.listing.transactionType === "sale" ? "매매" : "임대"}</dd>
                </div>
                <div>
                  <dt>가격</dt>
                  <dd>{formatMoney(detail.listing.priceMinor, detail.listing.currency)}</dd>
                </div>
                <div>
                  <dt>유형</dt>
                  <dd>{detail.listing.propertyType}</dd>
                </div>
                <div>
                  <dt>면적</dt>
                  <dd>
                    {detail.listing.areaSqmX100 == null
                      ? "-"
                      : `${detail.listing.areaSqmX100 / 100}㎡`}
                  </dd>
                </div>
                <div>
                  <dt>침실</dt>
                  <dd>{detail.listing.bedrooms ?? "-"}</dd>
                </div>
                <div>
                  <dt>욕실</dt>
                  <dd>{detail.listing.bathrooms ?? "-"}</dd>
                </div>
              </dl>
              {detail.listing.status === "ACTIVE" ? (
                <Link
                  className="review-public-link"
                  href={`/assets/${detail.listing.publicId}`}
                >
                  사용자 자산 화면 확인 <ExternalLink size={14} />
                </Link>
              ) : (
                <span className="review-public-pending">
                  검토 승인 후 사용자 자산 화면이 공개됩니다.
                </span>
              )}
            </section>

            <section className="review-evidence-section">
              <div className="workflow-section-head">
                <div>
                  <span>TRUST EVIDENCE</span>
                  <h2>Trust 계산 근거</h2>
                </div>
                <ShieldCheck size={22} />
              </div>
              {detail.trust ? (
                <>
                  <div className="review-trust-lead">
                    <strong>{detail.trust.score}</strong>
                    <div>
                      <span>{detail.trust.status}</span>
                      <p>{detail.trust.explanation}</p>
                    </div>
                  </div>
                  <dl className="review-trust-meta">
                    <div>
                      <dt>규칙 버전</dt>
                      <dd>{detail.trust.ruleVersion}</dd>
                    </div>
                    <div>
                      <dt>계산 시각</dt>
                      <dd>{formatDate(detail.trust.calculatedAt)}</dd>
                    </div>
                  </dl>
                  {dimensions.length > 0 ? (
                    <div className="review-dimensions">
                      {dimensions.map(([key, value]) => (
                        <div key={key}>
                          <span>{key}</span>
                          <strong>{formatEvidenceValue(value)}</strong>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="ops-empty">Trust 계산 결과가 없습니다.</p>
              )}
            </section>

            <section className="review-evidence-section">
              <div className="workflow-section-head">
                <div>
                  <span>PROVENANCE</span>
                  <h2>출처와 원본 추적</h2>
                </div>
                <Database size={22} />
              </div>
              <div className="review-source-list">
                {detail.sources.map((source) => (
                  <article key={`${source.slug}-${source.sourceUrl}`}>
                    <div>
                      <strong>{source.nameInternal}</strong>
                      <span>{source.approvalStatus}</span>
                    </div>
                    <p>
                      최초 {formatDate(source.firstSeenAt)} · 최근{" "}
                      {formatDate(source.lastSeenAt)}
                    </p>
                    <a href={source.sourceUrl} target="_blank" rel="noreferrer">
                      원본 주소 확인 <ExternalLink size={13} />
                    </a>
                  </article>
                ))}
              </div>
              {detail.latestVersion ? (
                <dl className="review-provenance">
                  <div>
                    <dt>최근 관측</dt>
                    <dd>{formatDate(detail.latestVersion.observedAt)}</dd>
                  </div>
                  <div>
                    <dt>변경 필드</dt>
                    <dd>
                      {detail.latestVersion.changedFields.length > 0
                        ? detail.latestVersion.changedFields.join(", ")
                        : "변경 없음"}
                    </dd>
                  </div>
                  <div>
                    <dt>원본 객체</dt>
                    <dd>{detail.latestVersion.rawObjectKey ?? "직접 원본 없음"}</dd>
                  </div>
                  <div>
                    <dt>원본 해시</dt>
                    <dd className="review-hash">
                      <Fingerprint size={13} />
                      {detail.latestVersion.rawContentHash ?? "기록 없음"}
                    </dd>
                  </div>
                </dl>
              ) : null}
            </section>

            <section className="review-evidence-section">
              <div className="workflow-section-head">
                <div>
                  <span>DECISION LEDGER</span>
                  <h2>이전 검토 결정</h2>
                </div>
                <History size={22} />
              </div>
              {detail.decisions.length > 0 ? (
                <div className="review-decision-history">
                  {detail.decisions.map((decision) => (
                    <article key={decision.id}>
                      <div>
                        <strong>
                          {decision.action === "PUBLISH" ? "게시 승인" : "보류"}
                        </strong>
                        <span>{formatDate(decision.createdAt)}</span>
                      </div>
                      <p>{decision.note}</p>
                      <small>{decision.reviewerName}</small>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="ops-empty">아직 기록된 검토 결정이 없습니다.</p>
              )}
            </section>
          </div>

          <aside className="listing-review-decision">
            <div className="workflow-section-head">
              <div>
                <span>ANALYST DECISION</span>
                <h2>검토 결정 기록</h2>
              </div>
              <ShieldCheck size={22} />
            </div>
            <ListingReviewActions
              publicId={detail.listing.publicId}
              status={detail.listing.status}
            />
          </aside>
        </div>
      </main>
    </>
  );
}

function statusLabel(status: string): string {
  if (status === "REVIEW_PENDING") return "검토 대기";
  if (status === "HELD") return "보류";
  if (status === "ACTIVE") return "게시 중";
  return status;
}

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

function formatEvidenceValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "확인" : "미확인";
  if (typeof value === "number" || typeof value === "string") {
    return String(value);
  }
  if (Array.isArray(value)) return `${value.length}개 항목`;
  if (value && typeof value === "object") return "구조화 근거";
  return "-";
}
