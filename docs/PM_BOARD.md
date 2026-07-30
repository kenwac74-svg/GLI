# GLI Web2 MVP Delivery Board

Updated: 2026-07-30

## Delivery policy

- Branch: `codex/web2-mvp`
- Production branch: `main`
- Integration owner: Codex
- Human approval owner: GLI Product Owner
- Release gate: build, lint, automated tests, staging user-flow review

## Milestones

| Milestone | Status | Exit gate |
|---|---|---|
| Sprint 0: baseline and architecture | IN PROGRESS | ADR, source policy, portable build, product smoke test |
| Sprint 1: React routes and data foundation | READY | iframe removed, D1 schema, asset list/detail API |
| Sprint 2: ingestion and data quality | BLOCKED | source permission plus fixture pipeline |
| Sprint 3: AI search and Trust | BACKLOG | grounded search and deterministic Trust v0.1 |
| Sprint 4: identity, MY GLI, consultation, membership | BACKLOG | persistent user workflows |
| Sprint 5: Direct, reports, alerts, operations | BACKLOG | pilot operating workflow |
| Pilot release | BACKLOG | security, data audit, production deployment |

## Active tasks

| ID | Owner | Reviewer | Status | Deliverable |
|---|---|---|---|---|
| GLI-001 | Codex | Architecture review | IN PROGRESS | repository baseline, ADR, CI, tests |
| GLI-002 | Research | Human/Legal | IN PROGRESS | source permission register |
| GLI-003 | Codex | Data review | READY | D1 schema and migration |
| GLI-004 | Data QA | Codex | BLOCKED | approved, anonymized source fixtures |
| GLI-005 | Codex | Security review | BACKLOG | first approved connector |

## Accepted decisions

- Reuse the existing Cloudflare Sites project for the Web2 MVP.
- Use D1 and R2 for MVP persistence.
- Preserve internal provenance while keeping end-user source labels neutral.
- Do not production-crawl Realestate.com.kh without written authorization.
- Keep Web3 screens outside production Web2 navigation.
