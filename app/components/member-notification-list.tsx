"use client";

import { ArrowRight, BellRing, LoaderCircle } from "lucide-react";
import { useState } from "react";
import type { MemberNotification } from "../../db/member-notifications";

export function MemberNotificationList({
  notifications,
}: {
  notifications: MemberNotification[];
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  async function openNotification(notification: MemberNotification) {
    if (pendingId) return;
    setFeedback("");
    if (notification.readAt === null) {
      setPendingId(notification.id);
      try {
        const response = await fetch(
          `/api/notifications/${encodeURIComponent(notification.id)}/read`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: "{}",
          },
        );
        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error ?? "알림을 처리할 수 없습니다.");
        }
      } catch (error) {
        setFeedback(
          error instanceof Error
            ? error.message
            : "알림을 처리할 수 없습니다.",
        );
        setPendingId(null);
        return;
      }
    }
    window.location.assign(notification.href);
  }

  return (
    <div className="member-notification-list">
      {notifications.map((notification) => (
        <article
          className={notification.readAt === null ? "is-unread" : ""}
          key={notification.id}
        >
          <BellRing aria-hidden="true" size={18} />
          <div>
            <strong>{notification.title}</strong>
            <p>{notification.body}</p>
            <time dateTime={new Date(notification.createdAt).toISOString()}>
              {new Date(notification.createdAt).toLocaleString("ko-KR")}
            </time>
          </div>
          <button
            type="button"
            onClick={() => openNotification(notification)}
            disabled={pendingId !== null}
          >
            {pendingId === notification.id ? (
              <LoaderCircle className="spin" size={15} />
            ) : (
              <ArrowRight size={15} />
            )}
            확인
          </button>
        </article>
      ))}
      {feedback ? <p aria-live="polite">{feedback}</p> : null}
    </div>
  );
}
