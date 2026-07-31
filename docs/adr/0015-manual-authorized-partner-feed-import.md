# ADR-0015: Manual authorized partner-feed import

- Status: Accepted
- Date: 2026-07-31
- Decision owner: GLI Product Owner
- Technical owner: Codex PM / Technical Lead

## Context

The licensed feed worker is ready, but a production partner may initially
deliver a versioned JSON file instead of exposing a continuously available API.
GLI needs a controlled administrator workflow for that material without
creating a second, less-governed ingestion path.

## Decision

- A real active administrator may upload a `gli.partner-listings.v1` JSON file
  only for an approved, unexpired `LICENSED_JSON_V1` source.
- The configured source slug, exact HTTPS host, permitted fields, file size and
  record limit are enforced before any listing is accepted.
- The exact uploaded bytes are written to the existing R2 raw-object boundary
  with a SHA-256 hash and `manual-upload` collection metadata.
- The existing normalization, privacy, duplicate identity, provenance, audit
  and failure-handling workflow processes every accepted record.
- Imported listings remain private in `REVIEW_PENDING` until an authorized GLI
  operator reviews and publishes them.
- Shared demo administrators may validate file structure in the browser but
  the server rejects import attempts from demo identities.

## Consequences

- Licensed data can enter the MVP before a partner operates a live endpoint,
  without bypassing the source policy or review queue.
- Suspension or expiry blocks manual and network collection through the same
  policy contract.
- Manual import does not prove permission to crawl a public portal and does not
  satisfy the live external-source pilot gate by itself.
- Production operation still requires a real administrator, written source
  authorization, R2 retention policy and approved licensed material.
