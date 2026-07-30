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
import { getOperationsDashboard } from "../../db/operations";
import { ensureMemberContext } from "../../lib/member-data";
import { IngestionAction, ListingReviewActions } from "./admin-actions";

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

  const dashboard = await getOperationsDashboard(context.database);
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
                  <span>{source.country}</span>
                </div>
                <span
                  className={`source-status status-${source.approvalStatus.toLowerCase()}`}
                >
                  {source.approvalStatus}
                </span>
              </article>
            ))}
          </div>
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
