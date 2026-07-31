import { ArrowLeft, MessagesSquare, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "../../../auth";
import { ConsultationMessageForm } from "../../../components/consultation-message-form";
import {
  ConsultationTimeline,
  consultationStatus,
} from "../../../components/consultation-timeline";
import { SiteHeader } from "../../../components/site-header";
import { getAdminConsultationThread } from "../../../../db/consultation-thread";
import type { ConsultationStatus } from "../../../../db/consultation-operations";
import { ensureMemberContext } from "../../../../lib/member-data";
import { ConsultationAdminActions } from "../../admin-actions";

export const dynamic = "force-dynamic";

export default async function AdminConsultationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const context = user ? await ensureMemberContext(user) : null;
  if (context?.workflowUser.role !== "ADMIN") redirect("/admin");

  const thread = await getAdminConsultationThread(context.database, {
    consultationId: id,
    actorUserId: context.workflowUser.id,
  });
  if (!thread) notFound();

  return (
    <>
      <SiteHeader />
      <main className="admin-page consultation-page">
        <Link className="page-back-link" href="/admin">
          <ArrowLeft size={16} /> 운영센터
        </Link>

        <header className="consultation-page-head">
          <div>
            <p className="section-kicker">CONSULTATION OPERATIONS</p>
            <h1>{thread.listingTitle ?? "일반 투자 상담"}</h1>
            <p>회원에게 공개되는 진행 내역과 답변을 관리합니다.</p>
          </div>
          <span className={`consultation-state state-${thread.status.toLowerCase()}`}>
            {consultationStatus(thread.status)}
          </span>
        </header>

        <div className="consultation-case-layout">
          <section className="consultation-thread-panel">
            <div className="workflow-section-head">
              <div>
                <span>MEMBER-VISIBLE THREAD</span>
                <h2>공개 상담 스레드</h2>
              </div>
              <MessagesSquare size={22} />
            </div>
            <ConsultationTimeline thread={thread} />
            <ConsultationMessageForm
              endpoint={`/api/admin/consultations/${encodeURIComponent(thread.id)}/messages`}
              label="회원에게 답변"
              placeholder="확인 결과, 준비 자료 또는 다음 일정을 안내하세요."
              buttonLabel="답변 등록"
            />
          </section>

          <aside className="consultation-case-meta">
            <h2>운영 처리</h2>
            <div className="consultation-operator">
              <UserRound size={18} />
              <div>
                <span>담당자</span>
                <strong>{thread.assigneeDisplayName ?? "미배정"}</strong>
              </div>
            </div>
            <ConsultationAdminActions
              consultationId={thread.id}
              status={thread.status as ConsultationStatus}
            />
            <dl>
              <div>
                <dt>회원 요청</dt>
                <dd>{thread.requestText}</dd>
              </div>
              <div>
                <dt>현재 상태</dt>
                <dd>{consultationStatus(thread.status)}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </main>
    </>
  );
}
