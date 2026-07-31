# ADR-0002: Authorized partner-feed boundary

- Status: Accepted
- Date: 2026-07-31
- Decision owner: GLI Product Owner
- Technical owner: Codex PM / Technical Lead

## Context

The Cambodia MVP needs data from large property portals, but public access does
not grant permission to aggregate or republish listings. Each source can also
use a different transport and commercial agreement. The product must be ready
to connect an approved source without embedding a portal-specific crawler in
the public web application.

## Decision

- Production source execution runs through the separate ingestion-worker
  boundary.
- The first supported integration is a licensed, versioned JSON partner feed.
- The source policy stored in D1 controls approval status, connector kind,
  permitted fields, exact HTTPS hosts, expiry, and maximum records per run.
- Connector configuration may reference an environment-secret name, but never
  stores the credential itself.
- Raw responses are written to R2-compatible object storage. D1 stores only the
  object key, source URL, response status, timestamps, and SHA-256 hashes.
- Normalized records stay private in `REVIEW_PENDING` until a GLI operator
  publishes them.
- Portal-specific HTML collectors remain disabled until written authorization
  explicitly permits that collection method.

## Consequences

- A licensed API or feed can be connected without changing the public search
  and Trust Score code.
- Authorization changes stop execution before a network request.
- Failed upstream requests remain visible in ingestion and audit history.
- R2 lifecycle and orphan-object cleanup must be configured before pilot scale.
