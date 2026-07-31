# GLI Web2 MVP Delivery Board

Updated: 2026-07-31

## Delivery policy

- Branch: `codex/web2-mvp`
- Production branch: `main`
- Integration owner: Codex
- Human approval owner: GLI Product Owner
- Release gate: build, lint, automated tests, staging user-flow review

## Milestones

| Milestone | Status | Exit gate |
|---|---|---|
| Sprint 0: baseline and architecture | COMPLETE | ADR, source policy, portable build, product smoke test |
| Sprint 1: React routes and data foundation | COMPLETE | iframe removed, D1 schema, asset list/detail API |
| Sprint 2: ingestion and data quality | IN PROGRESS | approved fixture pipeline complete; first external source permission pending |
| Sprint 3: AI search and Trust | COMPLETE | grounded LLM advice, safe fallback, district intent and deterministic Trust v0.2 |
| Sprint 4: identity, MY GLI, consultation, membership | COMPLETE | persistent user workflows |
| Sprint 5: Direct, reports, alerts, operations | IN PROGRESS | collection, review, publish, alerts and retry loop complete; premium report packaging pending |
| Pilot release | BACKLOG | security, data audit, production deployment |

## Active tasks

| ID | Owner | Reviewer | Status | Deliverable |
|---|---|---|---|---|
| GLI-001 | Codex | Architecture review | COMPLETE | repository baseline, ADR, CI, tests |
| GLI-002 | Research | Human/Legal | IN PROGRESS | source permission register |
| GLI-003 | Codex | Data review | COMPLETE | D1 schema and migration |
| GLI-004 | Data QA | Codex | IN PROGRESS | approved, anonymized source fixtures |
| GLI-005 | Codex | Security review | BLOCKED | first approved connector |
| GLI-006 | Codex | Data QA | COMPLETE | fixture normalizer, dedupe, and privacy gate |
| GLI-007 | Codex | Product review | COMPLETE | conversational search and Trust Score v0.1 |
| GLI-008 | Codex | Operations review | COMPLETE | approved collection, dedupe, Trust calculation, review and publish workflow |
| GLI-009 | Codex | Product review | COMPLETE | district-aware conversational search |
| GLI-010 | Codex | Human/Legal | BLOCKED | first authorized external portal connector |
| GLI-011 | Codex | Security review | COMPLETE | grounded LLM orchestration, output validation, privacy hash and safe fallback |
| GLI-012 | Codex | Security/Data review | COMPLETE | licensed JSON feed worker, allowlist policy, raw snapshot provenance and failure audit |
| GLI-013 | Human/Legal | GLI Product Owner | IN PROGRESS | first partner feed authorization and credential handoff |
| GLI-014 | Codex | Security/Finance review | COMPLETE | provider-neutral checkout, signed event ledger, idempotent activation and refund access termination |
| GLI-015 | GLI Product Owner | Finance/Legal | IN PROGRESS | payment provider selection, refund policy and production credential approval |
| GLI-016 | Codex | Operations review | COMPLETE | health scan, alert lifecycle, retry backoff and dead-letter isolation |
| GLI-017 | Codex | Operations review | COMPLETE | scheduled worker entrypoint, bounded retry processing and allowlisted alert delivery |
| GLI-018 | GLI Operations | Security review | IN PROGRESS | production scheduler deployment, alert destination approval and secret provisioning |
| GLI-019 | Codex | Security/Data review | COMPLETE | administrator source onboarding, approval audit, demo read-only gate and emergency suspension |
| GLI-020 | Codex | Security/Operations review | COMPLETE | administrator audit center, workflow filters and recursive sensitive-value redaction |

## Decisions

| ID | Decision | Status |
|---|---|---|
| DEC-001 | Use the existing Cloudflare Sites project for the Web2 MVP | ACCEPTED |
| DEC-002 | Use D1 and R2 for MVP persistence | ACCEPTED |
| DEC-003 | Keep the user-facing source label neutral while preserving internal provenance | ACCEPTED |
| DEC-004 | Do not production-crawl Realestate.com.kh without written authorization | ACCEPTED |
| DEC-005 | Keep all Web3 screens outside the production Web2 navigation | ACCEPTED |
| DEC-006 | Retry transient connector failures outside the public web process and never retry policy denials | ACCEPTED |
| DEC-007 | Deliver only new or materially changed alerts to an exact allowlisted HTTPS destination | ACCEPTED |
| DEC-008 | Store source credential names only and reject source approval mutations from shared demo administrators | ACCEPTED |
| DEC-009 | Keep audit history administrator-only, read-only and redacted before rendering | ACCEPTED |

## Human gates

- Approve the first production data source and written usage basis.
- Approve Trust Score public wording and legal disclaimer.
- Select payment provider and membership refund policy.
- Name the Cambodia verifier and consultation operator.
- Approve the production alert destination and provision the scheduled worker secrets.

