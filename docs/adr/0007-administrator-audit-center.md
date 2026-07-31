# ADR 0007: Administrator Audit Center

Status: Accepted

Date: 2026-07-31

## Context

The Web2 MVP already writes append-only audit events for identity, favorites,
consultations, cash membership, ingestion, listing review, source management,
and operations health. Those events were stored in D1 but were not visible to
operators. Direct database access is not an appropriate daily review workflow.

Audit payloads can contain structured before and after snapshots. Even though
production credentials must never be persisted, the viewer must still assume
that sensitive fields can appear because of connector or provider mistakes.

## Decision

- Expose audit history on a separate `/admin/audit` route.
- Enforce active administrator authorization in the repository function as well
  as in the page.
- Provide fixed workflow categories. User input never becomes a free-form SQL
  predicate.
- Join the recorded actor to the user directory without requiring that the actor
  still exists.
- Redact sensitive keys recursively before returning structured snapshots.
- Redact bearer values, bound nesting, collection size, and string length.
- Render invalid historical JSON as a safe placeholder instead of failing the
  entire audit view.
- Keep audit history read-only and avoid creating a new event for every audit
  page view, which would pollute the operational trail.

## Consequences

Operators can inspect who changed a source, listing, consultation, or membership
without direct D1 access. The MVP now has an explicit review surface for pilot
security and partner audits.

The first implementation returns the latest 100 records at most. Cursor
pagination, retention policy, immutable export, and external SIEM delivery
remain production hardening tasks.

