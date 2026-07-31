"use client";

import { LoaderCircle, SendHorizontal } from "lucide-react";
import { FormEvent, useId, useState } from "react";
import { useRouter } from "next/navigation";

export function ConsultationMessageForm({
  endpoint,
  label,
  placeholder,
  buttonLabel,
}: {
  endpoint: string;
  label: string;
  placeholder: string;
  buttonLabel: string;
}) {
  const router = useRouter();
  const messageId = useId();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const clean = message.trim();
    if (clean.length < 2 || pending) return;
    setPending(true);
    setFeedback("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: clean }),
      });
      const payload = (await response.json()) as {
        result?: { id: string };
        error?: string;
      };
      if (!response.ok || !payload.result) {
        throw new Error(payload.error ?? "메시지를 등록할 수 없습니다.");
      }
      setMessage("");
      setFeedback("등록되었습니다.");
      router.refresh();
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "메시지를 등록할 수 없습니다.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="consultation-message-form" onSubmit={submit}>
      <label htmlFor={messageId}>{label}</label>
      <textarea
        id={messageId}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder={placeholder}
        rows={4}
        maxLength={1200}
      />
      <div>
        <small>{message.length}/1,200</small>
        <button type="submit" disabled={pending || message.trim().length < 2}>
          {pending ? (
            <LoaderCircle className="spin" size={17} />
          ) : (
            <SendHorizontal size={17} />
          )}
          {buttonLabel}
        </button>
      </div>
      {feedback ? <p aria-live="polite">{feedback}</p> : null}
    </form>
  );
}
