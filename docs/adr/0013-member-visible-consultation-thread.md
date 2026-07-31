# ADR 0013: Member-visible consultation thread

Date: 2026-07-31

## Status

Accepted

## Context

The first consultation workflow stored a request and exposed its status in MY
GLI. Operators could assign the request and move it through a bounded status
workflow, but neither side had a dedicated case page or a shared, durable
message history. A real property transaction needs repeated document questions,
verification updates, and next-step coordination.

## Decision

Store member messages, operator messages, and status changes as ordered
`consultation_events`. Provide separate member and administrator routes over
the same case ledger.

Every member read and write must include both consultation ID and authenticated
member ID. Every operator read and write must require an active `ADMIN` user.
Members cannot add messages after a consultation is completed or cancelled.

The event ledger stores the message body because it is the case record. The
general audit log stores the event ID, actor, event type, and body length, but
not the message body. This keeps operational audit export useful without
duplicating potentially sensitive consultation text.

## Consequences

- Members can follow one consultation from request through operator response.
- Operators can answer and change status from a dedicated case view.
- Ownership and role checks occur in the database workflow, not only in UI.
- Status changes become visible case events.
- Migration `0010_consultation_threads.sql` is required before deployment.
- Notification delivery and attachments remain later work.
