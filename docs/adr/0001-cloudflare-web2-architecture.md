# ADR-0001: Cloudflare-based Web2 MVP architecture

- Status: Accepted
- Date: 2026-07-30
- Decision owner: GLI Product Owner
- Technical owner: Codex PM / Technical Lead

## Context

The deployed prototype already uses vinext, Next.js App Router, Cloudflare Workers, and OpenAI Sites. Replacing this working foundation before validating the Cambodia MVP would add operational work without improving the first customer journey.

## Decision

The Web2 MVP uses:

- vinext and Next.js App Router for the public and operations web application
- Cloudflare D1 for structured records
- Cloudflare R2 for raw source snapshots, verification evidence, and generated reports
- a separate ingestion worker boundary for collection, retry, normalization, and deduplication
- Sign in with ChatGPT for hosted pilot identity, behind an adapter boundary
- a provider-neutral LLM gateway
- deterministic server-side Trust Score rules

The web application remains at the repository root for Sites compatibility. A future ingestion worker lives under `workers/ingestion`.

## Consequences

- The MVP can reuse the current deployment project and ship incrementally.
- D1 limits and write behavior must be monitored; PostgreSQL remains a scale-up path.
- Raw HTML, media, and evidence must not be stored in D1.
- Production crawling requires explicit source approval.
- Web3 provider interfaces remain dormant until Web2 business gates are met.
