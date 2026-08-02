import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileLock2,
  LockKeyhole,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTrustReportForMember } from "../../../../db/trust-report-access";
import { getAsset } from "../../../../lib/assets-data";
import { ensureMemberContext } from "../../../../lib/member-data";
import {
  demoSignInPath,
  getCurrentUser,
  isDemoAuthEnabled,
  signInPath,
} from "../../../auth";
import { SiteHeader } from "../../../components/site-header";
import { PrintReportButton } from "./print-report-button";

export const dynamic = "force-dynamic";

export default async function TrustReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { asset } = await getAsset(id);
  if (!asset) notFound();

  const returnTo = `/assets/${encodeURIComponent(id)}/trust-report`;
  const user = await getCurrentUser();
  if (!user) {
    return (
      <ReportGate
        assetId={asset.id}
        title="전체 Trust Report는 회원 전용입니다"
        copy="로그인하면 멤버십 상태를 확인하고 이 자산의 상세 검증 보고서를 열 수 있습니다."
        loginUrl={signInPath(returnTo)}
        demoLoginUrl={
          isDemoAuthEnabled() ? demoSignInPath(returnTo) : undefined
        }
      />
    );
  }

  const member = await ensureMemberContext(user);
  const access = await getTrustReportForMember(
    member.database,
    member.workflowUser.id,
    asset.id,
  );
  if (!access.granted) {
    return (
      <ReportGate
        assetId={asset.id}
        title={
          access.reason === "PLAN_UPGRADE_REQUIRED"
            ? "Investor 이상 플랜이 필요합니다"
            : "전체 Trust Report를 구독하세요"
        }
        copy={
          access.reason === "PLAN_UPGRADE_REQUIRED"
            ? "Explore 플랜에서는 검증 요약을 볼 수 있습니다. 전체 근거와 다음 확인 항목은 Investor 또는 Private 플랜에서 제공됩니다."
            : "현금 멤버십은 플랫폼 전체 자산의 고급 검증 보고서와 우선 상담에 적용됩니다."
        }
        membershipUrl="/membership"
      />
    );
  }

  const { report } = access;
  return (
    <>
      <SiteHeader />
      <main className="trust-report-page">
        <div className="report-toolbar">
          <Link href={`/assets/${asset.id}`}>
            <ArrowLeft size={17} /> 자산 상세
          </Link>
          <PrintReportButton />
        </div>

        <header className="report-hero">
          <div>
            <p className="section-kicker">GLI FULL TRUST REPORT</p>
            <h1>{asset.title}</h1>
            <span>
              <MapPin size={15} /> {asset.district}, {asset.city}, {asset.country}
            </span>
          </div>
          <div className="report-score">
            <small>TRUST SCORE</small>
            <strong>{report.score}</strong>
            <span>{statusLabel(report.trustStatus)}</span>
          </div>
        </header>

        <section className="report-meta">
          <div>
            <span>보고서 ID</span>
            <strong>{report.reportId}</strong>
          </div>
          <div>
            <span>평가 규칙</span>
            <strong>{report.ruleVersion}</strong>
          </div>
          <div>
            <span>평가 시각</span>
            <strong>{formatDate(report.calculatedAt)}</strong>
          </div>
          <div>
            <span>멤버십 접근</span>
            <strong>{access.membershipPlanId.toUpperCase()}</strong>
          </div>
        </section>

        <section className="report-conclusion">
          <div>
            <ShieldCheck size={24} />
            <p className="section-kicker">VERIFICATION SUMMARY</p>
            <h2>확보된 자료를 기준으로 한 현재 검증 결론</h2>
          </div>
          <p>{report.explanation}</p>
          <div className="report-disclaimer">
            <AlertTriangle size={18} />
            <span>
              이 보고서는 자료의 검증 수준을 설명하며 수익률, 투자 적합성,
              법적 유효성 또는 거래 안전성을 보장하지 않습니다.
            </span>
          </div>
        </section>

        <section className="report-evidence">
          <div className="report-section-head">
            <div>
              <p className="section-kicker">EVIDENCE STATUS</p>
              <h2>검증 근거와 남은 확인 항목</h2>
            </div>
            <span>연결 출처 {report.sourceCount}곳</span>
          </div>
          <div className="report-evidence-list">
            {report.evidence.map((item) => (
              <article key={item.key}>
                <StatusIcon status={item.status} />
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.detail}</p>
                </div>
                <span className={`evidence-status status-${item.status.toLowerCase()}`}>
                  {evidenceLabel(item.status)}
                </span>
              </article>
            ))}
          </div>
        </section>

        <div className="report-columns">
          <section>
            <p className="section-kicker">OBSERVED STRENGTHS</p>
            <h2>현재 확인된 강점</h2>
            <ul>
              {asset.strengths.map((item) => (
                <li key={item}>
                  <CheckCircle2 size={17} /> {item}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <p className="section-kicker">NEXT VERIFICATION</p>
            <h2>거래 전 추가 확인</h2>
            <ul>
              {asset.checks.map((item) => (
                <li key={item}>
                  <Clock3 size={17} /> {item}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="report-review">
          <div>
            <CalendarDays size={21} />
            <span>최근 자료 관측</span>
            <strong>{formatDate(report.lastObservedAt)}</strong>
          </div>
          <div>
            <FileLock2 size={21} />
            <span>사람 승인</span>
            <strong>
              {report.humanApproved
                ? `${report.reviewerName ?? "GLI 분석가"} · ${formatDate(report.approvedAt!)}`
                : "전문가 검토 진행 중"}
            </strong>
          </div>
          <Link href={`/my?consult=${asset.id}`}>이 자산 상담 신청</Link>
        </section>
      </main>
    </>
  );
}

function ReportGate({
  assetId,
  title,
  copy,
  loginUrl,
  demoLoginUrl,
  membershipUrl,
}: {
  assetId: string;
  title: string;
  copy: string;
  loginUrl?: string;
  demoLoginUrl?: string;
  membershipUrl?: string;
}) {
  return (
    <>
      <SiteHeader />
      <main className="trust-report-page report-gate-page">
        <Link className="back-link" href={`/assets/${assetId}`}>
          <ArrowLeft size={17} /> 자산 상세
        </Link>
        <section className="report-gate">
          <LockKeyhole size={34} />
          <p className="section-kicker">GLI FULL TRUST REPORT</p>
          <h1>{title}</h1>
          <p>{copy}</p>
          <div>
            {loginUrl ? <Link href={loginUrl}>로그인</Link> : null}
            {demoLoginUrl ? (
              <form method="post" action={demoLoginUrl}>
                <button type="submit">가족용 데모로 확인</button>
              </form>
            ) : null}
            {membershipUrl ? <Link href={membershipUrl}>멤버십 보기</Link> : null}
          </div>
        </section>
      </main>
    </>
  );
}

function StatusIcon({ status }: { status: string }) {
  return status === "CONFIRMED" ||
    status === "SUPPORTED" ||
    status === "CURRENT" ? (
    <CheckCircle2 size={21} />
  ) : status === "IN_REVIEW" ? (
    <Clock3 size={21} />
  ) : (
    <AlertTriangle size={21} />
  );
}

function statusLabel(status: string): string {
  if (status === "VERIFIED") return "검증 완료";
  if (status === "REVIEWING") return "전문가 검토 중";
  if (status === "NEEDS_ATTENTION") return "우선 확인 필요";
  return "예비 평가";
}

function evidenceLabel(status: string): string {
  return {
    CONFIRMED: "확인",
    SUPPORTED: "교차 확인",
    CURRENT: "최신",
    LIMITED: "제한적",
    IN_REVIEW: "검토 중",
    PENDING: "확인 필요",
  }[status] ?? status;
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeZone: "Asia/Phnom_Penh",
  }).format(new Date(timestamp));
}
