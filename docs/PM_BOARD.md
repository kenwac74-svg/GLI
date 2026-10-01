# GLI Web2 MVP Delivery Board

Updated: 2026-09-13

> Current handoff: [Executable development specification](implementation/README.md).
> Historical milestone/task completion below is preserved, not a production
> readiness claim. Use the GS registry for current implementation gaps and
> verification scope. The inspected branch is `agent/gli-ai-orchestration-demo`;
> branch names in the historical delivery policy are not deployment instructions.

## Delivery policy

2026-10-01 GS-005 / P47: connect only accessible Dot Property Philippines in
LOCAL/explicit demo. Actual server collection: 20 sale + 20 rent, PHP/KRW
reference and bounded detail cache passed. Lamudi/Rentpad and auxiliary sources
stay held. 262 tests/build passed; no new paid AI test, UI redesign or deployment.

2026-09-30 GS-005 / P45: user approved bounded demo reuse. Dot Property sale/rent
field mapping passed (20 each) and search/Map detail connected; VND budgets use
observed FX only. Homedy mapping, Batdongsan access and auxiliary sources stay held.
No UI redesign, paid AI verification call, public deployment or commercial approval.

2026-09-30 GS-005 / P44 supersedes P43 auxiliary collection: only fully reviewed
listing sources may activate. ERA is deferred; IQI/media/maps skipped; Batdongsan
probes stopped. Dot Property/Homedy are candidates on reuse/mapping hold, not
passed sources. See COUNTRY-SOURCES and HIST-20260930-005.

2026-09-30 GS-005 / P43: ERA Vietnam demo project-reference endpoint added;
Batdongsan direct collection is HTTP 403 blocked, not connected listing data.
Project references are separate from priced units and current search/AI/UI.
Commercial permission, durable storage and unit/rental mapping remain open.
See COUNTRY-SOURCES and HIST-20260930-004. No commit/push/deployment authorised.

2026-09-23 CHECKPOINT (P40/P41): implementation paused at the user's request until their next instruction after token replenishment. Local code validated through HIST-20260923-017 (232 tests); later records are backlog/policy only. Resume C1 detail identity, result return/state preservation, real processing-stage feedback, translation coverage/name rules and legacy detail labels as one planned batch. No commit/push/deployment authorized by this checkpoint.

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
| Sprint 6: end-user UI refinement | IN PROGRESS | consistent typography, responsive explore/detail flows, final-state visual simulation |
| Sprint 7: demand-driven discovery | BACKLOG | tiered live source search, searched-listing persistence, source recheck and staff research queue |
| Sprint 8: administrator operations console | BACKLOG | GLI-provided sample reviewed; role-based source, asset, research, member, cash, consultation and audit workflows connected |
| Pilot release | BACKLOG | security, data audit, production deployment |

## Active tasks

| ID | Owner | Reviewer | Status | Deliverable |
|---|---|---|---|---|
| GLI-001 | Codex | Architecture review | COMPLETE | repository baseline, ADR, CI, tests |
| GLI-002 | Research | Human/Legal | IN PROGRESS | source permission register |
| GLI-003 | Codex | Data review | COMPLETE | D1 schema and migration |
| GLI-004 | Data QA | Codex | IN PROGRESS | approved, anonymized source fixtures |
| GLI-005 | Codex | Security review | BLOCKED | first approved connector |
| GLI-006 | Codex | Data QA | COMPLETE | fixture normalizer, same-source idempotency, and privacy gate |
| GLI-007 | Codex | Product review | COMPLETE | conversational search and Trust Score v0.1 |
| GLI-008 | Codex | Operations review | COMPLETE | approved collection, same-source idempotency, Trust calculation, review and publish workflow |
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
| GLI-028 | Codex | Security/Data review | COMPLETE | authorized partner-file import through exact R2 raw provenance, source policy, privacy/same-source idempotency and private review queue |
| GLI-029 | Codex | Product/Security review | COMPLETE | five-case AI search evaluation, D1 evidence ledger, rules rehearsal and 30-day OpenAI readiness gate |
| GLI-030 | Codex | Product/Security review | COMPLETE | enforced cash-plan favorite limits, model-cost boundary, monthly Explore usage ledger and consultation priority queue |
| GLI-031 | Codex | Product review | COMPLETE | MY GLI server-derived favorite, deep-AI, consultation and Trust Report entitlement usage summary |
| GLI-032 | Codex | Security/Data review | COMPLETE | authorized UTF-8 CSV partner import with strict field contract, exact R2 provenance and shared privacy/same-source-idempotency/review boundaries |
| GLI-033 | Codex | Security/Operations review | COMPLETE | per-listing due-diligence page, mandatory publication checklist, bounded analyst note and immutable review-decision ledger |
| GLI-034 | Codex | Product review | COMPLETE | five-level asset-detail demonstrator, hierarchical access preview and blockchain-free GLI Cash simulation boundary |
| GLI-035 | Codex | Security/Data review | COMPLETE | bounded Khmer24 reference-search connector, robots content-signal enforcement, HTML provenance and source-side refusal handling |
| GLI-036 | GLI Product Owner | Human/Legal | BLOCKED | Khmer24 AI-use scope approval and collector allowlisting or authorized partner-feed handoff |
| GLI-037 | Codex | Security/Data review | COMPLETE | bounded public WordPress property API connector, robots enforcement, exact-field parsing and raw provenance |
| GLI-038 | GLI Product Owner | Human/Legal | BLOCKED | CAM Realty and Cambodia Property Asia written reuse and AI-reference scope approval |
| GLI-039 | Codex | Product/Security review | COMPLETE | allowlisted public source names, safe original-listing links, official GLI logo and aligned asset-access styling |
| GLI-040 | Codex | Product/Data review | COMPLETE | explicit demo-only source auto-approval and immediate publication with production review controls preserved |
| GLI-041 | Codex | Product review | COMPLETE | 14px public reading floor, restricted 12px exceptions, aligned detail-panel typography and direct asset-detail action label |
| GLI-042 | Codex | GLI Product Owner | IN PROGRESS | prototype-wide visual, responsive and interaction refinement before new operational features |
| GLI-043 | Codex | Product/Data review | BACKLOG | demand-driven tiered live discovery, searched-listing persistence and source-current-state recheck |
| GLI-044 | Codex | Product/Operations review | BACKLOG | source-specific nullable field states, `조사 예정` presentation and favorite-triggered staff research queue |
| GLI-045 | Codex | GLI Product Owner | COMPLETE | four-category Residential/Commercial/Leisure/Project navigation, representative UI inventory and category-aware detail forms |
| GLI-046 | GLI Product Owner | Product/Operations review | BACKLOG | provide the existing administrator-tool sample and identify the required navigation, roles and highest-priority operating workflows |
| GLI-047 | Codex | Product/Security/Operations review | BACKLOG | build a sample-aligned administrator console for source configuration, collection status, asset review/publish, favorite-triggered research, GLI-curated inventory, member/membership/GLI Cash, consultation, audit and operational monitoring |
| GLI-048 | Claude Design/Codex | GLI Product Owner | COMPLETE | follow-up composer with preserved context, inline loading/error states and mobile behavior; changed-result notice uses the currently displayed server result count and an accessible `변경된 탐색 결과 보기` action, while QA state controls remain excluded from the public UI |
| GLI-049 | Claude Design/Codex | GLI Product Owner | COMPLETE | add the three approved newsroom items and article routes for the demo; production news must be managed through an administrator CMS with create, edit, delete, schedule, publish and unpublish controls |
| GLI-050 | Codex | GLI Product Owner | COMPLETE | executable development specification: 32 features, 46 route files, history/next work, source annotations and partial OpenAPI; spec checker/self-tests, script lint, four visual hashes and ten comment-only application diffs verified; no runtime/UI deployment |
| GLI-051 | Claude Design/Codex | GLI Product Owner | IN PROGRESS | 2026-09-16: mobile-only patch applied; landing/explore width checks passed at 320/360/390/412/768/1440px; clipped menu scrolling repaired. Existing copy/data/events preserved. Awaiting user visual acceptance and real-device checks before public deployment; see HIST-20260916-001 |

## 2026-09-18 consultation follow-up

| ID | Owner | Reviewer | Status | Deliverable |
|---|---|---|---|---|
| GLI-052 | Codex PM/backend/integration; Claude Design UX | GLI Product Owner | IN PROGRESS / CANDIDATE CONTINUITY | P33 BuildBlock handoff B1-B5 prepared. Local search/review branching preserves prior IDs/order, resolves ordinal targets against public records and passes source/detail/check evidence. Astra synthetic 2-turn review and local actual candidate follow-up passed; 194 automated tests passed. Typing no longer restores the original sample list. Static card/detail C1 mapping, durable state, verified income/expenses, public trial limits, Claude UX and deployment remain pending. |

GLI-048 COMPLETE is a historical integration milestone, not proof of current consultation correctness. The 2026-09-18 review found ID/content mismatch, follow-up amount interpretation errors and a composer-order defect; GLI-052 tracks the follow-up without deleting past records.

GLI-052-PROGRESS (2026-09-23): QUEUED FOR NEXT BATCH. Replace the generic consultation loading sentence with specific, truthful server-stage feedback for initial and follow-up requests. User explicitly requested backlog registration only; no immediate UI/code change. Scope and acceptance: docs/implementation/GLI-052-INTEGRATION-20260923.md, "다음 일괄 업데이트 작업".

GLI-052-RETURN (2026-09-23): CONFIRMED DEFECT / NEXT BATCH. Claude detail lacks an explicit return-to-results button; preserve conversation, criteria, IDs/order and scroll without another paid search. Related C1 defect reproduced: GLI-KH-102 detail shows BKK1 rent $700/56sqm instead of search sale $75,360/47sqm. Correct ID-to-detail mapping with the return flow; scope/acceptance in GLI-052-INTEGRATION-20260923.md. Documentation only in this turn.

GLI-052-TRANSLATION-COVERAGE (2026-09-23): NEXT BATCH / GS-033 C1. Distinguish preserved proper names/geography, mixed-language fields skipped when any Hangul is present, and old hardcoded detail labels (including obsolete Trust Score). Review mixed-field translation coverage and align UI labels with approved design/grade policy; no runtime change in this recording task.

2026-10-01 GS-013/033: user reported translation/KRW failure. Scoped repair handles VND cross-rate display in cards/TOP3, saved-result FX restoration, known separate geography labels, mixed-language translation and quoted-name protection (compatible v1 cache reused). Full check 256 tests passed; local saved candidates show Korean places and KRW monthly values. No paid test/design change/commit/push/deploy. Remaining: live translation coverage, unknown geography/brands, fixed KRW budget parser and legacy detail labels. Other P41 backlog remains held.

GLI-052 / P34 follow-up (2026-09-18): GS-033 adds Gemini Korean translation for external listing text, preserving source facts and R2 originals. Local cards/detail/advisor share the projection; source translations are reused. No design or public deployment change. Legacy external detail still shows the old Trust Score/access tabs, and detail-to-explore navigation can temporarily restore fixture cards while retaining the external result count. These separate C1/navigation issues remain pending; translation work does not close them.

## Decisions

2026-09-23 P38 stage-1 backend follow-up: common D1 operating request guard (300 global/100 account daily; anonymous shared pool), independent provider usage ledger, discovery coalescing/cooldown, cancellation and bounded conversation context are implemented locally. Typecheck is now in `npm run check`; isolated build and 223 tests passed. Latest Claude design is not integrated; external-asset durability, guest identity, public deployment and GCP/AWS migration remain separate. See HIST-20260923-014 and implementation/AI-OPERATING-GUARD.md.

| ID | Decision | Status |
|---|---|---|
| DEC-001 | Use the existing Cloudflare Sites project for the Web2 MVP | ACCEPTED |
| DEC-002 | Use D1 and R2 for MVP persistence | ACCEPTED |
| DEC-003 | Show an approved public source name and direct original-listing link for actual external records; preserve complete provenance internally and never attribute fixtures | SUPERSEDED |
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
| DEC-020 | Treat JSON and CSV as delivery formats inside one licensed partner-source boundary; neither format may bypass source approval, host, field, privacy, same-source idempotency or private-review controls | ACCEPTED |
| DEC-021 | Require source-rights, fact, public-copy and limitation checks plus an analyst note before publication; store the full note only in the review ledger and keep audit metadata bounded | ACCEPTED |
| DEC-022 | Treat GLI Cash as provider-neutral prepaid platform value; use it for asset passes and future GLI products while keeping later token rails optional and separate | ACCEPTED |
| DEC-023 | Keep the five-level asset detail as a demonstrative UI until category content, pricing, duration, service scope and production entitlement matrices are separately approved | ACCEPTED |
| DEC-024 | Register every researched Cambodia portal, use only source-approved delivery methods, and never treat technical API access as permission to republish | ACCEPTED |
| DEC-025 | In the hosted demo only, configured source records may auto-publish behind an explicit environment flag; production must keep source authorization and human listing review | ACCEPTED |
| DEC-026 | Refine the current end-user UI and responsive visual system before implementing the new live-discovery and operations workflow | ACCEPTED |
| DEC-027 | Use demand-driven, tiered source discovery; store listings found by a real search and recheck the original post on later matching searches | ACCEPTED |
| DEC-028 | Do not merge or suppress similar posts across sources; retain only same-source idempotency for the exact source post | ACCEPTED |
| DEC-029 | Preserve a complete GLI property form, map each source separately, and show `조사 예정` when a source does not provide a field | ACCEPTED |
| DEC-030 | Create a prioritized staff research item and missing-field checklist when a member saves an interested asset | ACCEPTED |
| DEC-031 | Present source age with `신규`, `최신`, and `1년 경과` background badges while keeping source reliability internal | ACCEPTED |
| DEC-032 | Exclude social and community channels from automated discovery; GLI staff may research them manually | ACCEPTED |
| DEC-033 | Organize the global platform into Residential, Commercial, Leisure and Project; treat country as a separate filter and curate Project inventory through GLI | ACCEPTED |
| DEC-034 | Keep the administrator console visually separate from the end-user site but connect both to the same asset lifecycle, entitlement, consultation, audit and role-based service boundaries; finalize its information architecture from the GLI-provided sample before implementation | ACCEPTED |
| DEC-035 | Keep newsroom records hard-coded only for the prototype; the live platform must read administrator-authored and administrator-published news from the shared backend rather than from the public client bundle | ACCEPTED |
| DEC-036 | For follow-up searches, show a result-update notice only when candidate IDs or order actually change; call the returned card count `현재 확인 가능한 후보`, never present it as the source-wide inventory, and expose no QA state controls in the public UI | ACCEPTED |

## Human gates

- Approve the first production data source and written usage basis.
- Obtain Khmer24 collector allowlisting or an authorized feed/API credential.
- Obtain CAM Realty and Cambodia Property Asia written reuse and AI-reference authorization.
- Approve Trust Score public wording and legal disclaimer.
- Select payment provider and membership refund policy.
- Name the Cambodia verifier and consultation operator.
- Approve the production alert destination and provision the scheduled worker secrets.
