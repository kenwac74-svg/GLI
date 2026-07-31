# ADR 0014: Member consultation alerts

Date: 2026-07-31

## Status

Accepted

## Context

Consultation threads made operator replies and status history durable, but a
member still had to reopen each case to discover an update. MY GLI already
reserved an unread-alert indicator, but it was a fixed display value without a
server-owned notification record.

## Decision

Create a `member_notifications` ledger for member-facing consultation events.
Operator replies and status changes create one alert in the same database batch
as the underlying case event. A unique event key prevents duplicate alerts.

Alert reads and read mutations always include the authenticated member ID.
Opening another member's alert returns the same not-found result as an unknown
alert. Repeated read requests return the existing read timestamp without
creating duplicate audit events.

Alerts store a bounded title, summary, and same-origin case link. They do not
copy the consultation message body. The audit log records only the read-state
transition.

## Consequences

- MY GLI shows a real unread count and recent consultation updates.
- Members can move directly from an alert to the authorized case page.
- Operator messages, case events, and member alerts commit atomically.
- Email, SMS, and push delivery remain separate future adapters.
- Migration `0011_member_notifications.sql` is required before deployment.
