# ADR 0011: Membership-Gated Full Trust Reports

Status: Accepted

Date: 2026-07-31

## Context

The cash membership plans promised a full Trust Report to Investor and Private
members, but membership state was not connected to a separate report surface or
server-side data boundary. A client-only lock would still expose premium report
data to an ineligible browser.

The hosted family demonstration also uses a no-charge `DEMO_CASH` checkout.
That adapter must not remain callable when the same build is configured as a
production environment.

## Decision

- Keep the public Trust summary on the asset detail page.
- Add a separate `/assets/:id/trust-report` page and matching private API.
- Require an authenticated, active user and an unexpired Investor or Private
  cash membership before querying full report evidence.
- Return only an upgrade response to Explore members and no-membership users.
- Build the report from persisted listing, Trust run, source-count, observation,
  and human-approval evidence.
- Never infer legal validity, title safety, return, or completed field
  verification from a Trust score.
- Include the rule version, report ID, evidence status, limitations, and next
  verification actions.
- Support browser print and PDF saving without creating a separate mutable PDF
  record.
- Enable no-charge checkout, confirmation, and direct demo activation only when
  runtime configuration explicitly identifies a demo environment.

## Consequences

Cash membership now controls a concrete platform-wide premium capability rather
than acting only as a dashboard badge. Ineligible users cannot receive the full
report payload.

Production deployments fail closed until a real payment adapter is selected and
connected. Browser PDF output represents the current web report and must not be
described as an immutable signed legal report.

