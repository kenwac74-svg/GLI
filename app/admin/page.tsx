import {
  AlertTriangle,
  ClipboardCheck,
  Database,
  FileCheck2,
  LockKeyhole,
  MessagesSquare,
  RefreshCw,
  Shield,
} from "lucide-react";
import Link from "next/link";
import {
  demoAdminSignInPath,
  getCurrentUser,
  isDemoAdminEnabled,
  signOutPath,
} from "../auth";
import { SiteHeader } from "../components/site-header";
import { listConsultations } from "../../db/consultation-operations";
import { getOperationsDashboard } from "../../db/operations";
import { ensureMemberContext } from "../../lib/member-data";
import {
  ConsultationAdminActions,
  IngestionAction,
  ListingReviewActions,
} from "./admin-actions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  const context = user ? await ensureMemberContext(user) : null;
  const isAdmin = context?.workflowUser.role === "ADMIN";

  if (!isAdmin) {
    return (
      <>
        <SiteHeader />
        <main className="admin-page">
          <section className="admin-access">
            <LockKeyhole size={28} />
            <p className="section-kicker">GLI OPERATIONS</p>
            <h1>운영자 전용 화면</h1>
            <p>수집 실행과 자산 게시 권한이 있는 운영 계정으로 접속하세요.</p>
            <div>
              {isDemoAdminEnabled() ? (
                <form method="post" action={demoAdminSignInPath()}>
                  <button type="submit">운영 데모로 접속</button>
                </form>
              ) : null}
              {user ? <Link href={signOutPath("/admin")}>현재 계정 로그아웃</Link> : null}
            </div>
          </section>
        </main>
      </>
    );
  }

  const [dashboard, consultations] = await Promise.all([
    getOperationsDashboard(context.database),
    listConsultations(context.database),
  ]);
  const latestRun = dashboard.runs[0];

  return (
    <>
      <SiteHeader />
      <main className="admin-page">
        <div className="admin-head">
          <div>
            <p className="section-kicker">GLI OPERATIONS</p>
            <h1>검증 운영센터</h1>
            <p>승인된 자료를 수집하고 검토가 끝난 자산만 사용자 검색에 게시합니다.</p>
          </div>
          <span className="environment-badge">WEB2 MVP</span>
        </div>

        <div className="ops-grid">
          <section>
            <Database size={22} />
            <span>승인된 데이터 소스</span>
            <strong>{dashboard.metrics.approvedSources}</strong>
            <small>유효한 이용 승인을 가진 소스</small>
          </section>
          <section>
            <RefreshCw size={22} />
            <span>최근 수집 실행</span>
            <strong>{latestRun ? latestRun.status : "-"}</strong>
            <small>
              {latestRun
                ? `${latestRun.acceptedCount}건 반영 · ${formatDate(latestRun.startedAt)}`
                : "아직 실행 기록이 없습니다."}
            </small>
          </section>
          <section>
            <FileCheck2 size={22} />
            <span>검토 대기 자산</span>
            <strong>{dashboard.metrics.reviewPending}</strong>
            <small>게시 전 사람의 판단 필요</small>
          </section>
          <section>
            <Shield size={22} />
            <span>승인된 Trust Report</span>
            <strong>{dashboard.metrics.publishedTrustReports}</strong>
            <small>운영자 승인 이력이 있는 보고서</small>
          </section>
          <section>
            <MessagesSquare size={22} />
            <span>진행 중 상담</span>
            <strong>{dashboard.metrics.openConsultations}</strong>
            <small>접수 또는 일정 확정 상태</small>
          </section>
        </div>

        <section className="ops-workbench">
          <div className="ops-section-head">
            <div>
              <p className="section-kicker">COLLECTION</p>
              <h2>수집 실행</h2>
            </div>
            <IngestionAction />
          </div>
          <div className="source-list">
            {dashboard.sources.map((source) => (
              <article key={source.id}>
                <div>
                  <strong>{source.nameInternal}</strong>
                  <span>
                    {source.country} · {source.connectorKind}
                  </span>
                </div>
                <aside className="source-state-stack">
                  <span
                    className={`source-status status-${source.approvalStatus.toLowerCase()}`}
                  >
                    {source.approvalStatus}
                  </span>
                  <small>{connectorStatusLabel(source.connectorStatus)}</small>
                </aside>
              </article>
            ))}
          </div>
        </section>

        <section className="ops-workbench">
          <div className="ops-section-head">
            <div>
              <p className="section-kicker">CONSULTATIONS</p>
              <h2>상담 운영</h2>
            </div>
            <MessagesSquare size={24} />
          </div>
          {consultations.length ? (
            <div className="ops-consultations">
              {consultations.map((consultation) => (
                <article key={consultation.id}>
                  <div className="ops-consultation-main">
                    <div>
                      <span
                        className={`consultation-state state-${consultation.status.toLowerCase()}`}
                      >
                        {consultationStatusLabel(consultation.status)}
                      </span>
                      <strong>
                        {consultation.listingTitle ?? "일반 투자 상담"}
                      </strong>
                    </div>
                    <p>{consultation.requestText}</p>
                    <dl>
                      <div>
                        <dt>신청자</dt>
                        <dd>
                          {consultation.memberDisplayName ??
                            consultation.memberEmail}
                        </dd>
                      </div>
                      <div>
                        <dt>희망 일시</dt>
                        <dd>
                          {consultation.preferredAt
                            ? formatDate(consultation.preferredAt)
                            : "협의 필요"}
                        </dd>
                      </div>
                      <div>
                        <dt>담당자</dt>
                        <dd>
                          {consultation.assigneeDisplayName ??
                            consultation.assigneeEmail ??
                            "미배정"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <ConsultationAdminActions
                    consultationId={consultation.id}
                    status={consultation.status}
                  />
                </article>
              ))}
            </div>
          ) : (
            <p className="ops-empty">접수된 상담이 없습니다.</p>
          )}
        </section>

        <section className="ops-workbench">
          <div className="ops-section-head">
            <div>
              <p className="section-kicker">REVIEW QUEUE</p>
              <h2>자산 검토 및 게시</h2>
            </div>
            <ClipboardCheck size={24} />
          </div>
          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>자산</th>
                  <th>지역</th>
                  <th>Trust</th>
                  <th>상태</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.listings.map((listing) => (
                  <tr key={listing.publicId}>
                    <td>
                      <Link href={`/assets/${listing.publicId}`}>
                        <strong>{listing.title}</strong>
                        <small>{listing.publicId}</small>
                      </Link>
                    </td>
                    <td>
                      {listing.city}
                      <small>{listing.district ?? "-"}</small>
                    </td>
                    <td>
                      <b>{listing.trustScore}</b>
                      <small>{listing.trustStatus}</small>
                    </td>
                    <td>
                      <span
                        className={`listing-state state-${listing.status.toLowerCase()}`}
                      >
                        {statusLabel(listing.status)}
                      </span>
                    </td>
                    <td>
                      <ListingReviewActions
                        publicId={listing.publicId}
                        status={listing.status}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="ops-workbench">
          <div className="ops-section-head">
            <div>
              <p className="section-kicker">RUN HISTORY</p>
              <h2>최근 수집 기록</h2>
            </div>
          </div>
          <div className="run-list">
            {dashboard.runs.length ? (
              dashboard.runs.map((run) => (
                <article key={run.id}>
                  <div>
                    <strong>#{run.id} · {run.sourceSlug}</strong>
                    <span>{formatDate(run.startedAt)}</span>
                  </div>
                  <span>{run.status}</span>
                  <small>
                    발견 {run.discoveredCount} · 반영 {run.acceptedCount} · 제외{" "}
                    {run.rejectedCount}
                  </small>
                </article>
              ))
            ) : (
              <p className="ops-empty">수집 실행 기록이 없습니다.</p>
            )}
          </div>
        </section>

        <div className="ops-alert">
          <AlertTriangle size={21} />
          <div>
            <strong>외부 포털 자동 수집은 아직 잠겨 있습니다</strong>
            <p>현재 실행 버튼은 이용 승인이 완료된 내부 데모 피드에만 연결됩니다.</p>
          </div>
        </div>
      </main>
    </>
  );
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Phnom_Penh",
  }).format(new Date(timestamp));
}

function statusLabel(status: string): string {
  if (status === "ACTIVE") return "게시";
  if (status === "HELD") return "보류";
  if (status === "REVIEW_PENDING") return "검토 대기";
  return status;
}

function consultationStatusLabel(status: string): string {
  if (status === "RECEIVED") return "신규 접수";
  if (status === "CONTACTED") return "연락 중";
  if (status === "SCHEDULED") return "일정 확정";
  if (status === "COMPLETED") return "완료";
  if (status === "CANCELLED") return "취소";
  return status;
}

function connectorStatusLabel(status: string): string {
  if (status === "READY") return "실행 준비";
  if (status === "APPROVAL_REQUIRED") return "이용 승인 필요";
  if (status === "CONFIGURATION_REQUIRED") return "연결 설정 필요";
  return status;
}
