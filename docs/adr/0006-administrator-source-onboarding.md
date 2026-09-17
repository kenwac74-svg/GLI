# ADR-0006: Administrator source onboarding

- Status: Accepted
- Date: 2026-07-31
- Decision owner: GLI Product Owner
- Technical owner: Codex PM / Technical Lead

## Context

External property sources cannot be enabled safely through hard-coded database
changes. Operations need a reviewable workflow that joins the written usage
approval and the technical feed boundary, while the publicly shared demo
administrator must not be able to activate external collection.

## Decision

- Each registered source has a separate administrator configuration page.
- Approval requires a written approval reference and an explicit operator
  confirmation.
- The feed must use a public HTTPS host without credentials, a custom port, or
  a fragment.
- The exact feed hostname becomes the connector allowlist.
- The connector receives the fixed GLI licensed-feed field contract and a
  bounded record limit.
- Optional authorization references must use a `SOURCE_SECRET_*` environment
  secret name. Credential values are never accepted or persisted.
- Approval records the administrator, approval time, policy review time,
  optional expiry, and an audit before/after view.
- An active administrator can immediately suspend a source without deleting its
  connection or audit history.
- Source configuration reads and writes require an active administrator.
- Shared demo administrators can simulate form validation but the API rejects
  their mutations.

## Consequences

- A newly authorized partner can be connected without editing application code.
- Written approval and technical restrictions remain one auditable operation.
- The first production partner still requires its actual contract, feed URL,
  credential secret, and data-quality acceptance.
