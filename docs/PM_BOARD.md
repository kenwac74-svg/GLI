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
| Sprint 5: Direct, reports, alerts, operations | COMPLETE | collection, review, publish, alerts, retry loop and membership-gated report packaging complete |
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
| GLI-021 | Codex | Security/Operations review | COMPLETE | stable audit pagination, bounded CSV export, query indexes and pilot retention policy |
| GLI-022 | Codex | Security/Operations review | COMPLETE | evidence-based pilot readiness center and administrator backup/restore evidence ledger |
| GLI-023 | Codex | Security/Product review | COMPLETE | built-worker member and administrator E2E verification plus MVP completion matrix |
| GLI-024 | Codex | Security/Product review | COMPLETE | Investor/Private full Trust Report entitlement, PDF print view and production demo-billing lock |
| GLI-025 | Codex | Security/Product review | COMPLETE | multi-turn advisor UI with validated structured criteria context, reset boundary and mobile follow-up composer |
| GLI-026 | Codex | Security/Operations review | COMPLETE | member-scoped consultation detail, member/operator messages, status history and mobile case view |
| GLI-027 | Codex | Security/Product review | COMPLETE | member-scoped consultation alerts, unread count, idempotent read action and MY GLI alert center |
| GLI-028 | Codex | Security/Data review | COMPLETE | authorized partner-file import through exact R2 raw provenance, source policy, privacy/dedupe and private review queue |
| GLI-029 | Codex | Product/Security review | COMPLETE | five-case AI search evaluation, D1 evidence ledger, rules rehearsal and 30-day OpenAI readiness gate |
| GLI-030 | Codex | Product/Security review | COMPLETE | enforced cash-plan favorite limits, model-cost boundary, monthly Explore usage ledger and consultation priority queue |
| GLI-031 | Codex | Product review | COMPLETE | MY GLI server-derived favorite, deep-AI, consultation and Trust Report entitlement usage summary |

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
| DEC-010 | Bound synchronous audit export to 30 days and 1,000 redacted, spreadsheet-safe rows | ACCEPTED |
| DEC-011 | Block pilot release until automated operational gates and named human approvals have evidence | ACCEPTED |
| DEC-012 | Verify member and administrator journeys against the generated worker artifact and all D1 migrations | ACCEPTED |
| DEC-013 | Keep full Trust Report evidence server-gated to Investor/Private and fail closed on demo billing outside demo | ACCEPTED |
| DEC-014 | Continue advisor sessions with validated search criteria only; do not persist or replay raw conversation history | ACCEPTED |
| DEC-015 | Store consultation messages in a case event ledger, authorize every read by member ownership or active administrator role, and keep message bodies out of general audit metadata | ACCEPTED |
| DEC-016 | Notify members in-app for operator replies and status changes, without copying consultation message bodies into alert or general audit metadata | ACCEPTED |
| DEC-017 | Manual partner-file imports never bypass source approval, field, host, size or record limits; shared demo administrators may validate files only | ACCEPTED |
| DEC-018 | Require a recent successful current-suite OpenAI evaluation in addition to runtime configuration; rules rehearsals never satisfy the production AI gate | ACCEPTED |
| DEC-019 | Enforce global cash-plan benefits server-side; keep anonymous search in rules mode, restore failed model usage, and retain GLIB staking as a later asset-specific boundary | ACCEPTED |

## Human gates

- Approve the first production data source and written usage basis.
- Approve Trust Score public wording and legal disclaimer.
- Select payment provider and membership refund policy.
- Name the Cambodia verifier and consultation operator.
- Approve the production alert destination and provision the scheduled worker secrets.
