import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleSlash2,
  DatabaseBackup,
  LockKeyhole,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import {
  getReleaseReadinessDashboard,
  type ReleaseGate,
  type ReleaseGateStatus,
} from "../../../db/release-readiness";
import { ensureMemberContext } from "../../../lib/member-data";
import { getCurrentUser } from "../../auth";
import { SiteHeader } from "../../components/site-header";
import { BackupEvidenceForm } from "./backup-evidence-form";

export const dynamic = "force-dynamic";

export default async function ReadinessPage() {
  const user = await getCurrentUser();
  const context = user ? await ensureMemberContext(user) : null;
  if (context?.workflowUser.role !== "ADMIN") {
    return (
      <>
        <SiteHeader />
        <main className="admin-page">
          <section className="admin-access">
            <LockKeyhole size={28} />
            <p className="section-kicker">PILOT READINESS</p>
            <h1>운영자 권한이 필요합니다</h1>
            <p>출시 준비 증적은 운영 관리자만 확인할 수 있습니다.</p>
            <div>
              <Link href="/admin">운영센터로 돌아가기</Link>
            </div>
          </section>
        </main>
      </>
    );
  }

  const dashboard = await getReleaseReadinessDashboard(
    context.database,
    context.workflowUser.id,
    {
      aiConfigured:
        process.env.LLM_PROVIDER === "openai" &&
        Boolean(process.env.OPENAI_API_KEY),
      paymentConfigured:
        process.env.PRODUCTION_PAYMENT_ADAPTER_ENABLED === "true",
      schedulerConfigured:
        process.env.SCHEDULED_OPERATIONS_ENABLED === "true",
    },
  );
  const demoReadOnly = context.authUser.authProvider === "demo";

  return (
    <>
      <SiteHeader />
      <main className="admin-page readiness-page">
        <Link className="source-config-back" href="/admin">
          <ArrowLeft size={16} />
          운영센터
        </Link>
        <div className="admin-head">
          <div>
            <p className="section-kicker">PILOT READINESS</p>
            <h1>파일럿 출시 준비센터</h1>
            <p>
              출시 여부를 기능 수가 아니라 운영 증적과 승인 상태로 판단합니다.
            </p>
          </div>
          <span
            className={`readiness-overall status-${dashboard.overall.toLowerCase()}`}
          >
            {overallLabel(dashboard.overall)}
          </span>
        </div>

        <div className="readiness-summary">
          <section>
            <CheckCircle2 size={21} />
            <span>통과</span>
            <strong>{dashboard.summary.passed}</strong>
          </section>
          <section>
            <AlertTriangle size={21} />
            <span>주의</span>
            <strong>{dashboard.summary.warnings}</strong>
          </section>
          <section>
            <CircleSlash2 size={21} />
            <span>차단</span>
            <strong>{dashboard.summary.blocked}</strong>
          </section>
        </div>

        <section className="readiness-gates">
          <div className="ops-section-head">
            <div>
              <p className="section-kicker">AUTOMATED EVIDENCE</p>
              <h2>자동 출시 판정</h2>
            </div>
            <ShieldCheck size={23} />
          </div>
          <div className="readiness-gate-list">
            {dashboard.gates.map((gate) => (
              <ReadinessGateRow key={gate.id} gate={gate} />
            ))}
          </div>
        </section>

        <div className="readiness-columns">
          <section className="readiness-section">
            <div className="ops-section-head">
              <div>
                <p className="section-kicker">BACKUP & RESTORE</p>
                <h2>백업·복원 증적</h2>
              </div>
              <DatabaseBackup size={22} />
            </div>
            {dashboard.latestBackup ? (
              <dl className="backup-latest">
                <div>
                  <dt>환경</dt>
                  <dd>{dashboard.latestBackup.environment}</dd>
                </div>
                <div>
                  <dt>복원 결과</dt>
                  <dd>{dashboard.latestBackup.restoreResult}</dd>
                </div>
                <div>
                  <dt>백업 시각</dt>
                  <dd>{formatDate(dashboard.latestBackup.capturedAt)}</dd>
                </div>
                <div>
                  <dt>확인자</dt>
                  <dd>
                    {dashboard.latestBackup.verifierName ??
                      dashboard.latestBackup.verifiedByUserId}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="readiness-empty">
                아직 등록된 백업·복원 증적이 없습니다.
              </p>
            )}
            <BackupEvidenceForm demoReadOnly={demoReadOnly} />
          </section>

          <section className="readiness-section">
            <div className="ops-section-head">
              <div>
                <p className="section-kicker">HUMAN APPROVALS</p>
                <h2>사람의 승인</h2>
              </div>
              <UserCheck size={22} />
            </div>
            <div className="human-approval-list">
              {dashboard.humanApprovals.map((approval) => (
                <article key={approval.label}>
                  <div>
                    <strong>{approval.label}</strong>
                    <span>{approval.owner}</span>
                  </div>
                  <em>승인 필요</em>
                </article>
              ))}
            </div>
            <p className="readiness-policy-note">
              자동 판정이 모두 통과해도 법무·재무·운영 책임자의 승인을 대신하지
              않습니다.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}

function ReadinessGateRow({ gate }: { gate: ReleaseGate }) {
  return (
    <article className={`readiness-gate status-${gate.status.toLowerCase()}`}>
      <span>{groupLabel(gate.group)}</span>
      <div>
        <strong>{gate.label}</strong>
        <p>{gate.evidence}</p>
        {gate.nextAction ? <small>{gate.nextAction}</small> : null}
      </div>
      <em>{statusLabel(gate.status)}</em>
    </article>
  );
}

function groupLabel(group: ReleaseGate["group"]): string {
  return {
    DATA: "데이터",
    PRODUCT: "제품",
    OPERATIONS: "운영",
    GOVERNANCE: "거버넌스",
  }[group];
}

function statusLabel(status: ReleaseGateStatus): string {
  return { PASS: "통과", WARNING: "주의", BLOCKED: "차단" }[status];
}

function overallLabel(status: ReleaseGateStatus): string {
  return status === "PASS"
    ? "출시 준비 완료"
    : status === "WARNING"
      ? "조건부 검토"
      : "출시 준비 진행 중";
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Phnom_Penh",
  }).format(new Date(timestamp));
}

