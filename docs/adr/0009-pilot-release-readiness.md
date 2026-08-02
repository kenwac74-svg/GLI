# ADR 0009: Evidence-Based Pilot Release Readiness

Status: Accepted

Date: 2026-07-31

## Context

Feature completion alone does not prove that the GLI Web2 MVP can enter a real
pilot. Data rights, external collection, Trust approval, payment and AI
configuration, operational failures, staffing, and restoration evidence are
separate release conditions.

## Decision

- Expose a separate administrator-only `/admin/readiness` route.
- Derive automated gates from D1 operational evidence and boolean runtime
  configuration state without exposing secret values.
- Keep legal, finance, and named-operator approvals explicit and separate from
  automated gates.
- Treat any blocked automated gate as a blocked pilot release.
- Store backup evidence with environment, storage reference, manifest hash,
  capture time, restore result, verifier, and point-in-time record counts.
- Require an active real administrator for evidence writes. Shared demo
  administrators remain read-only.
- Make identical backup object/hash submissions idempotent.
- Audit the first evidence record and preserve failed restore evidence.
- Require a successful production restore within 90 days for the backup gate
  to pass.

## Consequences

The demo can show what remains before launch without claiming that simulated
integrations are production-ready. Release state is explainable and linked to
operational evidence.

The dashboard does not replace penetration testing, legal approval, payment
certification, or a restoration drill. Production readiness remains blocked
until those external gates are completed.
