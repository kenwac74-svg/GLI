import {
  ArrowRight,
  AlertTriangle,
  BellRing,
  ClipboardCheck,
  Database,
  FileCheck2,
  LockKeyhole,
  MessagesSquare,
  RefreshCw,
  Rocket,
  ScrollText,
  Settings2,
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
import { getOperationsHealthDashboard } from "../../db/operations-health";
import { listRecentPaymentEvents } from "../../db/payment-webhooks";
import { ensureMemberContext } from "../../lib/member-data";
import {
  ConsultationAdminActions,
  IngestionAction,
  OperationalAlertActions,
  OperationsHealthAction,
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

  const [dashboard, consultations, paymentEvents, health] = await Promise.all([
    getOperationsDashboard(context.database),
    listConsultations(context.database),
    listRecentPaymentEvents(context.database),
    getOperationsHealthDashboard(context.database),
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
          <div className="admin-head-actions">
            <Link href="/admin/readiness">
              <Rocket size={16} />
              출시 준비
            </Link>
            <Link href="/admin/audit">
              <ScrollText size={16} />
              감사 기록
            </Link>
            <span className="environment-badge">WEB2 MVP</span>
          </div>
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
          <section>
            <BellRing size={22} />
            <span>운영 경보</span>
            <strong>{health.metrics.openCritical + health.metrics.openWarnings}</strong>
            <small>
              긴급 {health.metrics.openCritical} · 주의 {health.metrics.openWarnings}
            </small>
          </section>
        </div>

        <section className="ops-workbench">
          <div className="ops-section-head">
            <div>
              <p className="section-kicker">OPERATIONS HEALTH</p>
              <h2>운영 상태와 재시도</h2>
            </div>
            <OperationsHealthAction />
          </div>
          <div className="health-summary">
            <span>
              재시도 대기 <strong>{health.metrics.pendingRetries}</strong>
            </span>
            <span>
              최종 실패 <strong>{health.metrics.deadLetters}</strong>
            </span>
            <span>
              알림 대기 <strong>{health.metrics.pendingNotifications}</strong>
            </span>
          </div>
          {health.alerts.length ? (
            <div className="ops-alert-list">
              {health.alerts.map((alert) => (
                <article
                  key={alert.id}
                  className={`severity-${alert.severity.toLowerCase()}`}
                >
                  <div className="ops-alert-copy">
                    <div>
                      <span>{operationalAlertStatusLabel(alert.status)}</span>
                      <small>{alert.category}</small>
                    </div>
                    <strong>{alert.title}</strong>
                    <p>{alert.detail}</p>
                  </div>
                  <OperationalAlertActions
                    alertId={alert.id}
                    status={alert.status}
                  />
                </article>
              ))}
            </div>
          ) : (
            <p className="ops-empty">
              현재 열린 운영 경보가 없습니다. 상태 점검을 실행하면 승인 만료,
              수집·결제 실패, 상담 지연과 데이터 최신성을 확인합니다.
            </p>
          )}
          {health.retryJobs.length ? (
            <div className="run-list retry-job-list">
              {health.retryJobs.map((job) => (
                <article key={job.id}>
                  <div>
                    <strong>#{job.id} · {job.jobType}</strong>
                    <span>시도 {job.attemptCount}/{job.maxAttempts}</span>
                  </div>
                  <span>{job.status}</span>
                  <small>{job.lastError ?? "대기 중"}</small>
                </article>
              ))}
            </div>
          ) : null}
        </section>

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
                  <Link
                    className="source-settings-link"
                    href={`/admin/sources/${source.slug}`}
                  >
                    <Settings2 size={14} />
                    설정
                  </Link>
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
                      <span
                        className={`consultation-priority priority-${consultation.priority.toLowerCase()}`}
                      >
                        {consultationPriorityLabel(consultation.priority)}
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
                  <div className="ops-consultation-actions-wrap">
                    <Link href={`/admin/consultations/${consultation.id}`}>
                      상담 열기 <ArrowRight size={14} />
                    </Link>
                    <ConsultationAdminActions
                      consultationId={consultation.id}
                      status={consultation.status}
                    />
                  </div>
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
                      <Link
                        className="review-detail-link"
                        href={`/admin/listings/${listing.publicId}`}
                      >
                        실사 검토 <ArrowRight size={14} />
                      </Link>
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

        <section className="ops-workbench">
          <div className="ops-section-head">
            <div>
              <p className="section-kicker">PAYMENT EVENTS</p>
              <h2>현금 멤버십 결제 이력</h2>
            </div>
          </div>
          <div className="run-list">
            {paymentEvents.length ? (
              paymentEvents.map((event) => (
                <article key={event.id}>
                  <div>
                    <strong>{event.provider} · {event.eventType}</strong>
                    <span>{formatDate(event.receivedAt)}</span>
                  </div>
                  <span>{event.status}</span>
                  <small>
                    {event.checkoutId ?? "결제 세션 미연결"}
                    {event.errorSummary ? ` · ${event.errorSummary}` : ""}
                  </small>
                </article>
              ))
            ) : (
              <p className="ops-empty">
                실제 결제사는 아직 연결되지 않았습니다. 서명된 이벤트만 이 원장에
                기록됩니다.
              </p>
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

function consultationPriorityLabel(priority: string): string {
  if (priority === "PRIVATE") return "전담 상담";
  if (priority === "PRIORITY") return "우선 상담";
  return "일반 상담";
}

function connectorStatusLabel(status: string): string {
  if (status === "READY") return "실행 준비";
  if (status === "APPROVAL_REQUIRED") return "이용 승인 필요";
  if (status === "CONFIGURATION_REQUIRED") return "연결 설정 필요";
  return status;
}

function operationalAlertStatusLabel(status: string): string {
  if (status === "OPEN") return "조치 필요";
  if (status === "ACKNOWLEDGED") return "담당 확인";
  if (status === "RESOLVED") return "해결";
  return status;
}

