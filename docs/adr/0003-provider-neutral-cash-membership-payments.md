# ADR-0003: Provider-neutral cash membership payments

- Status: Accepted
- Date: 2026-07-31
- Decision owner: GLI Product Owner
- Technical owner: Codex PM / Technical Lead

## Context

Cash membership is global and account-scoped, but GLI has not selected a
production payment provider or approved its refund policy. Connecting a
provider SDK directly to membership state would make provider migration,
reconciliation, and safe webhook testing harder.

## Decision

- Checkout session creation uses a provider adapter that returns an opaque
  provider session ID, HTTPS checkout URL, and expiry.
- Provider signature verification receives the raw request bytes and headers.
  It returns a normalized completion, refund, or expiry event.
- Verification happens before the event is written to the payment ledger.
- Provider event IDs and provider session IDs are unique.
- Completion must match the checkout amount and currency before a membership is
  activated.
- Duplicate completion events return the existing membership without creating a
  second one.
- Refund events mark the checkout and membership `REFUNDED` and end access at
  the verified event time.
- Raw webhook payloads and payment credentials are not stored. The ledger keeps
  a SHA-256 payload hash, normalized event type, processing state, timestamps,
  checkout link, and bounded error summary.
- The public webhook route remains disabled until the selected provider's
  verifier, secret, retry policy, and refund policy are approved.

## Consequences

- A payment provider can be added without changing MY GLI or membership access
  queries.
- Failed amount checks and processing errors are visible in the operations
  screen.
- Provider reconciliation and chargeback handling remain part of the production
  payment integration.
