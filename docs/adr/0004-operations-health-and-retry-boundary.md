# ADR-0004: Operations health and retry boundary

- Status: Accepted
- Date: 2026-07-31
- Decision owner: GLI Product Owner
- Technical owner: Codex PM / Technical Lead

## Context

The Web2 MVP now has durable collection, consultation, and cash-membership
workflows. Operators need one place to see conditions that require action, while
temporary partner-feed failures need bounded recovery without turning the
public website into a crawler or background worker.

## Decision

- A deduplicated alert ledger records operational conditions and their
  acknowledgement and resolution lifecycle.
- A health scan reconciles source-approval expiry, recent ingestion failures,
  failed payment events, delayed consultations, and stale active listings.
- Transient licensed-feed failures create retry jobs with bounded exponential
  backoff and a fixed attempt limit.
- Exhausted jobs enter a dead-letter state and remain visible to operators.
- Source-policy denials never enter the retry queue.
- External retries run only through the ingestion worker boundary, not through
  public pages or public API routes.
- Health scans and alert updates require an active administrator and write an
  audit record.

## Consequences

- Temporary source outages can recover without duplicate operator work.
- Legal and source-policy denials remain fail-closed.
- Alert history survives acknowledgement and resolution.
- A production scheduler and notification channel still need to be selected
  before pilot operations.
