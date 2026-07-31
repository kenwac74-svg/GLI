import {
  AlertTriangle,
  ArrowLeft,
  Clock3,
  DatabaseZap,
  Download,
  History,
  LockKeyhole,
} from "lucide-react";
import Link from "next/link";
import {
  AUDIT_CATEGORIES,
  getAuditDashboard,
  type AuditCategory,
  type AuditEvent,
} from "../../../db/audit-log";
import { ensureMemberContext } from "../../../lib/member-data";
import { getCurrentUser } from "../../auth";
import { SiteHeader } from "../../components/site-header";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<AuditCategory, string> = {
  ALL: "전체",
  IDENTITY: "회원",
  ASSET: "자산 검토",
  COLLECTION: "수집",
  SOURCE: "소스",
  CONSULTATION: "상담",
  MEMBERSHIP: "멤버십",
  OPERATIONS: "운영",
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; cursor?: string }>;
}) {
  const user = await getCurrentUser();
  const context = user ? await ensureMemberContext(user) : null;
  if (context?.workflowUser.role !== "ADMIN") {
    return (
      <>
        <SiteHeader />
        <main className="admin-page">
          <section className="admin-access">
            <LockKeyhole size={28} />
            <p className="section-kicker">AUDIT CENTER</p>
            <h1>운영자 권한이 필요합니다</h1>
            <p>감사 기록은 운영 관리자만 확인할 수 있습니다.</p>
            <div>
              <Link href="/admin">운영센터로 돌아가기</Link>
            </div>
          </section>
        </main>
      </>
    );
  }

  const query = await searchParams;
  const requestedCategory = query.category;
  const category = AUDIT_CATEGORIES.includes(
    requestedCategory as AuditCategory,
  )
    ? (requestedCategory as AuditCategory)
    : "ALL";
  const cursor =
    query.cursor && /^\d{1,16}\.\d{1,16}$/.test(query.cursor)
      ? query.cursor
      : undefined;
  const dashboard = await getAuditDashboard(
    context.database,
    context.workflowUser.id,
    { category, cursor, limit: 25 },
  );
  const categoryQuery =
    dashboard.category === "ALL" ? "" : `category=${dashboard.category}`;

  return (
    <>
      <SiteHeader />
      <main className="admin-page audit-page">
        <Link className="source-config-back" href="/admin">
          <ArrowLeft size={16} />
          운영센터
        </Link>
        <div className="admin-head">
          <div>
            <p className="section-kicker">AUDIT CENTER</p>
            <h1>업무 감사 기록</h1>
            <p>
              주요 변경의 행위자와 대상을 추적합니다. 인증정보와 비밀값은
              화면에 표시되기 전에 자동으로 가립니다.
            </p>
          </div>
          <span className="environment-badge">ADMIN ONLY</span>
        </div>

        <div className="audit-metrics">
          <section>
            <History size={20} />
            <span>전체 기록</span>
            <strong>{dashboard.metrics.totalEvents}</strong>
          </section>
          <section>
            <Clock3 size={20} />
            <span>최근 24시간</span>
            <strong>{dashboard.metrics.last24Hours}</strong>
          </section>
          <section>
            <AlertTriangle size={20} />
            <span>주의 기록</span>
            <strong>{dashboard.metrics.attentionEvents}</strong>
          </section>
          <section>
            <DatabaseZap size={20} />
            <span>소스·수집 기록</span>
            <strong>{dashboard.metrics.sourceEvents}</strong>
          </section>
        </div>

        <nav className="audit-filters" aria-label="감사 기록 유형">
          {AUDIT_CATEGORIES.map((item) => (
            <Link
              key={item}
              href={item === "ALL" ? "/admin/audit" : `/admin/audit?category=${item}`}
              className={dashboard.category === item ? "is-active" : undefined}
              aria-current={dashboard.category === item ? "page" : undefined}
            >
              {CATEGORY_LABELS[item]}
            </Link>
          ))}
        </nav>

        <section className="audit-log">
          <div className="audit-log-head">
            <div>
              <p className="section-kicker">EVENT TRAIL</p>
              <h2>{CATEGORY_LABELS[dashboard.category]} 기록</h2>
            </div>
            <div className="audit-log-tools">
              <span>현재 {dashboard.events.length}건</span>
              <a
                href={`/api/admin/audit/export${categoryQuery ? `?${categoryQuery}` : ""}`}
                download
              >
                <Download size={14} />
                최근 30일 CSV
              </a>
            </div>
          </div>
          {dashboard.events.length ? (
            <div className="audit-event-list">
              {dashboard.events.map((event) => (
                <AuditEventRow key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <p className="audit-empty">이 유형의 감사 기록이 없습니다.</p>
          )}
          {dashboard.page.cursor || dashboard.page.nextCursor ? (
            <nav className="audit-pagination" aria-label="감사 기록 페이지">
              {dashboard.page.cursor ? (
                <Link
                  href={`/admin/audit${categoryQuery ? `?${categoryQuery}` : ""}`}
                >
                  최신 기록으로
                </Link>
              ) : (
                <span />
              )}
              {dashboard.page.nextCursor ? (
                <Link
                  href={`/admin/audit?${[
                    categoryQuery,
                    `cursor=${dashboard.page.nextCursor}`,
                  ]
                    .filter(Boolean)
                    .join("&")}`}
                >
                  이전 기록 보기
                </Link>
              ) : null}
            </nav>
          ) : null}
        </section>
      </main>
    </>
  );
}

function AuditEventRow({ event }: { event: AuditEvent }) {
  const hasChange = event.before !== null || event.after !== null;
  return (
    <article className="audit-event">
      <div className="audit-event-marker" aria-hidden="true" />
      <div className="audit-event-main">
        <div className="audit-event-title">
          <span>{categoryLabel(event.category)}</span>
          <strong>{actionLabel(event.action)}</strong>
          <time dateTime={new Date(event.createdAt).toISOString()}>
            {formatDate(event.createdAt)}
          </time>
        </div>
        <dl className="audit-event-meta">
          <div>
            <dt>행위자</dt>
            <dd>
              {event.actorName ?? event.actorEmail ?? event.actorUserId ?? "시스템"}
            </dd>
          </div>
          <div>
            <dt>대상</dt>
            <dd>
              {event.resourceType} · {event.resourceId}
            </dd>
          </div>
          {event.requestId ? (
            <div>
              <dt>요청 ID</dt>
              <dd>{event.requestId}</dd>
            </div>
          ) : null}
        </dl>
        {hasChange ? (
          <details className="audit-change">
            <summary>변경 내용 확인</summary>
            <div>
              <JsonSnapshot label="변경 전" value={event.before} />
              <JsonSnapshot label="변경 후" value={event.after} />
            </div>
          </details>
        ) : null}
      </div>
    </article>
  );
}

function JsonSnapshot({ label, value }: { label: string; value: unknown }) {
  return (
    <section>
      <h3>{label}</h3>
      <pre>{value == null ? "기록 없음" : JSON.stringify(value, null, 2)}</pre>
    </section>
  );
}

function categoryLabel(category: AuditEvent["category"]): string {
  return category === "OTHER"
    ? "기타"
    : CATEGORY_LABELS[category as AuditCategory];
}

function actionLabel(action: string): string {
  return action
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Phnom_Penh",
  }).format(new Date(timestamp));
}

