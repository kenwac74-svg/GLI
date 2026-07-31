import {
  ArrowLeft,
  CalendarClock,
  LogIn,
  MessagesSquare,
  UserRoundCheck,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  demoSignInPath,
  getCurrentUser,
  isDemoAuthEnabled,
  signInPath,
} from "../../../auth";
import { ConsultationMessageForm } from "../../../components/consultation-message-form";
import {
  ConsultationTimeline,
  consultationStatus,
} from "../../../components/consultation-timeline";
import { SiteHeader } from "../../../components/site-header";
import { getMemberConsultationThread } from "../../../../db/consultation-thread";
import { ensureMemberContext } from "../../../../lib/member-data";

export const dynamic = "force-dynamic";

export default async function MemberConsultationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const returnTo = `/my/consultations/${encodeURIComponent(id)}`;
  const user = await getCurrentUser();

  if (!user) {
    return (
      <>
        <SiteHeader />
        <main className="my-page consultation-page">
          <section className="member-login">
            <UserRoundCheck size={34} />
            <h1>상담 내역은 회원 전용입니다</h1>
            <p>상담을 신청한 계정으로 로그인해 진행 내역을 확인하세요.</p>
            <div className="member-login-actions">
              <Link className="login-cta" href={signInPath(returnTo)}>
                <LogIn size={18} /> ChatGPT로 로그인
              </Link>
              {isDemoAuthEnabled() ? (
                <form method="post" action={demoSignInPath(returnTo)}>
                  <button className="demo-login" type="submit">
                    가족용 데모 계정으로 체험
                  </button>
                </form>
              ) : null}
            </div>
          </section>
        </main>
      </>
    );
  }

  const context = await ensureMemberContext(user);
  const thread = await getMemberConsultationThread(context.database, {
    consultationId: id,
    memberUserId: context.workflowUser.id,
  });
  if (!thread) notFound();
  const isClosed =
    thread.status === "COMPLETED" || thread.status === "CANCELLED";

  return (
    <>
      <SiteHeader />
      <main className="my-page consultation-page">
        <Link className="page-back-link" href="/my">
          <ArrowLeft size={16} /> MY GLI
        </Link>

        <header className="consultation-page-head">
          <div>
            <p className="section-kicker">CONSULTATION CASE</p>
            <h1>{thread.listingTitle ?? "일반 투자 상담"}</h1>
            <p>
              상담번호 {thread.id} · 신청 내용과 GLI 상담팀의 답변을 한곳에서
              확인합니다.
            </p>
          </div>
          <span className={`consultation-state state-${thread.status.toLowerCase()}`}>
            {consultationStatus(thread.status)}
          </span>
        </header>

        <div className="consultation-case-layout">
          <section className="consultation-thread-panel">
            <div className="workflow-section-head">
              <div>
                <span>CASE HISTORY</span>
                <h2>상담 진행 내역</h2>
              </div>
              <MessagesSquare size={22} />
            </div>
            <ConsultationTimeline thread={thread} />
            {isClosed ? (
              <p className="consultation-closed">
                이 상담은 종료되어 추가 메시지를 등록할 수 없습니다.
              </p>
            ) : (
              <ConsultationMessageForm
                endpoint={`/api/consultations/${encodeURIComponent(thread.id)}/messages`}
                label="추가 질문"
                placeholder="확인이 필요한 계약 조건이나 현지 실사 내용을 남겨주세요."
                buttonLabel="질문 등록"
              />
            )}
          </section>

          <aside className="consultation-case-meta">
            <h2>상담 정보</h2>
            <dl>
              <div>
                <dt>현재 상태</dt>
                <dd>{consultationStatus(thread.status)}</dd>
              </div>
              <div>
                <dt>담당자</dt>
                <dd>{thread.assigneeDisplayName ?? "배정 준비 중"}</dd>
              </div>
              <div>
                <dt>희망 일시</dt>
                <dd>
                  {thread.preferredAt ? (
                    <>
                      <CalendarClock size={15} />
                      {new Date(thread.preferredAt).toLocaleString("ko-KR")}
                    </>
                  ) : (
                    "상담팀과 협의"
                  )}
                </dd>
              </div>
              {thread.listingPublicId ? (
                <div>
                  <dt>연결 자산</dt>
                  <dd>
                    <Link href={`/assets/${thread.listingPublicId}`}>
                      {thread.listingPublicId}
                    </Link>
                  </dd>
                </div>
              ) : null}
            </dl>
          </aside>
        </div>
      </main>
    </>
  );
}
