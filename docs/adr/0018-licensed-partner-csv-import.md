# ADR 0018: Licensed partner CSV import

## Status

Accepted on 2026-07-31.

## Context

Authorized property portals and agencies often provide CSV exports before they
offer a stable API. GLI already accepts a versioned JSON partner feed, but a
JSON-only handoff creates avoidable onboarding work for otherwise approved
partners.

The delivery format must not become a new authorization path or weaken the
existing source-policy, provenance, privacy, same-source idempotency, or
publication controls. Similar posts from different sources are not merged.

## Decision

GLI accepts UTF-8 CSV as a manual delivery format for sources already approved
under the licensed partner connector boundary.

- The CSV header must contain every canonical partner field exactly once.
- Unknown, duplicate, missing, malformed, oversized, or invalid UTF-8 input is
  rejected before raw storage or listing mutation.
- RFC 4180 quoted commas, newlines, and escaped quotes are supported.
- Exact uploaded CSV bytes are hashed and stored in R2 with `.csv` provenance.
- CSV candidates use the same normalization, contact-information rejection,
  same-source idempotency, Trust preparation, and `REVIEW_PENDING` workflow as
  JSON candidates. Cross-source similarity is not a suppression rule.
- Shared demo administrators may validate a file locally but cannot import it.
- CSV does not authorize crawling, broaden approved hosts, or add requested
  fields.

## Consequences

Partner onboarding can begin with ordinary spreadsheet exports while legal and
technical API access is negotiated. Operations must provide partners with the
canonical header template and UTF-8 export guidance. A future network CSV
connector requires a separate reviewed implementation even though it may reuse
this parser.
