# ADR-0001: Cloudflare-based Web2 MVP architecture

- Status: Accepted
- Date: 2026-07-30
- Decision owner: GLI Product Owner
- Technical owner: Codex PM / Technical Lead

## Context

The existing deployed prototype already uses vinext, Next.js App Router, Cloudflare Workers, and OpenAI Sites. The earlier development specification proposed a generic PostgreSQL, Redis, and object-storage stack. Replacing the working deployment foundation before validating the Cambodia MVP would add migration and operations work without improving the first customer journey.

## Decision

The Web2 MVP will use:

- vinext and Next.js App Router for the public and operations web application
- Cloudflare D1 for structured records
- Cloudflare R2 for raw source snapshots, verification evidence, and generated reports
- a separate ingestion worker boundary for scheduled collection, retry, normalization, and deduplication
- Sign in with ChatGPT for the hosted pilot identity flow, with an adapter boundary for future public identity providers
- a provider-neutral LLM gateway
- deterministic server-side Trust Score rules

The repository remains a single product repository. The web application stays at the repository root for Sites compatibility. A future ingestion worker lives under `workers/ingestion`.

## Consequences

- The MVP can reuse the current deployment project and ship incrementally.
- D1 storage limits and write behavior must be monitored. A PostgreSQL migration path remains a scale-up option.
- Raw HTML, media, and evidence must not be stored in D1.
- Production crawling requires a separately deployed scheduled worker and explicit source approval.
- Web3 provider interfaces remain dormant until the Web2 business gates are met.

## Superseded guidance

This ADR supersedes the generic infrastructure recommendation in section 8 of `GLI_WEB2_MVP_DEVELOPMENT_SPEC_V1.md` for the MVP implementation only. Product requirements, API boundaries, Trust rules, and Web3 separation in that specification remain authoritative.
