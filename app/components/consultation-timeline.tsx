import {
  CheckCircle2,
  CircleDot,
  MessageSquareText,
  UserRound,
} from "lucide-react";
import type { ConsultationThread } from "../../db/consultation-thread";

export function ConsultationTimeline({
  thread,
}: {
  thread: ConsultationThread;
}) {
  return (
    <div className="consultation-timeline">
      <article>
        <div className="timeline-marker">
          <CircleDot size={17} />
        </div>
        <div>
          <span>상담 신청</span>
          <time>{formatDateTime(thread.createdAt)}</time>
          <p>{thread.requestText}</p>
        </div>
      </article>
      {thread.events.map((event) => (
        <article key={event.id}>
          <div className="timeline-marker">
            {event.eventType === "STATUS_CHANGED" ? (
              <CheckCircle2 size={17} />
            ) : event.eventType === "MEMBER_MESSAGE" ? (
              <UserRound size={17} />
            ) : (
              <MessageSquareText size={17} />
            )}
          </div>
          <div>
            <span>{eventLabel(event.eventType, event.status)}</span>
            <time>{formatDateTime(event.createdAt)}</time>
            {event.body ? <p>{event.body}</p> : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function eventLabel(type: string, status: string | null): string {
  if (type === "MEMBER_MESSAGE") return "회원 추가 질문";
  if (type === "OPERATOR_MESSAGE") return "GLI 상담팀 답변";
  if (type === "STATUS_CHANGED") {
    return `진행 상태 · ${consultationStatus(status ?? "")}`;
  }
  return "상담 업데이트";
}

export function consultationStatus(status: string): string {
  if (status === "RECEIVED") return "접수";
  if (status === "CONTACTED") return "담당자 연락 중";
  if (status === "SCHEDULED") return "일정 확정";
  if (status === "COMPLETED") return "완료";
  if (status === "CANCELLED") return "취소";
  return status;
}

function formatDateTime(value: number): string {
  return new Date(value).toLocaleString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
