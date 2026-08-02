# GLI Web2 MVP Completion Matrix

Updated: 2026-07-31

## Status definitions

- `VERIFIED`: implementation, automated evidence, and a runnable user surface exist.
- `TECHNICALLY READY`: the adapter and safety boundary are implemented, but a real
  provider, credential, agreement, or production binding is still required.
- `EXTERNAL GATE`: GLI or a third party must provide approval, credentials, policy,
  staffing, or licensed data. A demo simulation is not counted as completion.

## Requirement evidence

| Area | Current status | Authoritative evidence | Remaining condition |
|---|---|---|---|
| Normalized property model | VERIFIED FOR CURRENT DEMO | D1 migrations `0000`-`0013`, `db/schema.ts`, normalization and repository tests | Add source-specific nullable field states and `조사 예정` handling from ADR 0021 before demand-driven discovery |
| Provenance and immutable source snapshots | VERIFIED | `ingestion/feed-worker.ts`, licensed network and manual-import connectors, R2 snapshot contract, listing versions, audit records, ingestion tests | Production R2 binding and retention approval |
| Source authorization boundary | VERIFIED | source policy registry, allowlisted HTTPS hosts and fields, expiry/suspension checks, admin source and partner-file import UI, built-worker tests | None for the boundary itself |
| Live external Cambodia sources | EXTERNAL GATE | Readiness gate and PM tasks GLI-002, GLI-005, GLI-010, GLI-013 remain open | Written permission or partner feed for each production source, credentials, permitted fields |
| Conversational property search | VERIFIED | `/api/search`, intent extraction, district-aware filtering, validated multi-turn criteria context, deterministic fallback and rendered-worker tests | None for rules mode |
| Grounded LLM advisor | TECHNICALLY READY | `lib/ai-search.ts`, five-case evaluation suite, D1 quality-evidence ledger, 30-day readiness gate, grounded citation tests and unsafe-output fallback | Hosted OpenAI key, selected model evaluation and human quality approval |
| Trust Score | VERIFIED | deterministic versioned rules, evidence dimensions, non-guarantee language, Trust tests | Public wording and legal disclaimer approval before pilot |
| Trust review and publication | VERIFIED | per-listing due-diligence page, mandatory four-part checklist, bounded analyst note, immutable decision ledger, publication audit trail and built-worker tests | Named GLI analyst/verifier for live operation |
| Full Trust Report access | VERIFIED | separate private report API/page, Investor/Private server entitlement, Explore paywall, evidence-only content and print/PDF UX | Legal wording approval and live analyst-approved reports |
| Account and MY GLI | VERIFIED | authenticated user creation, plan-enforced favorites, prioritized consultations, member-scoped in-app alerts, server-derived entitlement usage dashboard, `/my`, built-worker E2E test | Production identity policy and account support owner |
| Cash membership product | VERIFIED | separate `/membership` and checkout routes, global account-level plans, server-enforced favorite and deep-AI limits, consultation priority, Investor/Private report entitlement, demo no-charge activation | None for the product model |
| Tiered asset detail and GLI Cash | VERIFIED FOR DEMO | five-level Free/Basic/Standard/Premium/Business detail tabs, inherited lower-level access, local no-charge GLI Cash confirmation flow and ADR 0020 | Approve category content matrices, prices, access duration, durable cash ledger, recharge/refund rules and Business service scope |
| Real cash payment | TECHNICALLY READY | provider-neutral checkout adapter, signed webhook ledger, idempotency, refund access termination and tests | Provider selection, merchant account, credentials, refund policy, certification |
| Consultation workflow | VERIFIED | member intake, member-scoped case page, member/operator messages, status history, in-app reply/status alerts, assignment, admin operations and built-worker tests | Named Cambodia consultation operator and SLA |
| Administrator control center | VERIFIED | sources, authorized partner-file import, ingestion/review, AI quality rehearsal/evidence, consultation operations, alerts, audit center, CSV export and readiness center | Production administrators and least-privilege assignment |
| Operations and recovery | TECHNICALLY READY | health scan, retries, dead-letter queue, allowlisted notification delivery, readiness and backup evidence | Production scheduler, alert destination, secrets, real backup/restore drill |
| Responsive end-user interface | VERIFIED FOR DEMO | public explore, asset detail, MY GLI, membership pages and desktop/mobile browser QA | Formal accessibility audit and target-device acceptance |
| Deployable architecture | VERIFIED | vinext/Cloudflare Worker build, D1/R2 bindings, Sites deployment, GitHub CI | Production environment bindings and domain decision |
| Web3 separation | VERIFIED | Web3 navigation and blockchain settlement are excluded from the Web2 MVP | Add only as a later bounded integration phase |

## Built-worker journey evidence

`tests/deployment-workflows.test.mjs` executes the same
`dist/server/index.js` artifact that is packaged for deployment. It applies every
D1 migration to an isolated SQLite-backed D1 adapter and verifies:

1. Anonymous member API access is denied.
2. An authenticated member is created and can save an asset idempotently.
3. The member can submit an asset-linked consultation and add a follow-up.
4. An administrator can reply, and the member-visible case page renders both messages.
5. MY GLI exposes a member-scoped unread alert and the member can mark it read.
6. A priced cash-membership checkout is created and confirmed without a demo charge.
7. MY GLI returns the saved asset, consultation, and active global membership.
8. The rendered MY GLI page contains the resulting asset and plan.
9. A non-admin cannot export audit history.
10. An administrator can record backup/restore evidence and export redacted audit CSV.
11. The administrator readiness page renders from the migrated database.
12. An authorized partner JSON or CSV file is stored as an exact R2 raw snapshot,
    normalized, kept idempotent for the same source post, and placed in `REVIEW_PENDING`; suspension blocks
    the next import before another raw object is written.
13. An administrator can run the five-case rules evaluation through the built
    Worker, persist its summary and case checks, and render the evidence in the
    readiness center.
14. Authenticated free search remains rules-only, paid search exposes the correct
    plan entitlement, and a disabled model runtime does not consume usage.
15. MY GLI returns and renders the server-derived favorite, deep-AI,
    consultation-priority and Trust Report entitlement state.
16. The per-listing due-diligence page renders source and Trust evidence,
    incomplete publication evidence is rejected, and a complete analyst decision
    is written to the immutable review ledger before the listing becomes active.

The full `npm run check` gate currently covers lint, migration validation,
production build, and 109 automated tests.

## Pilot blockers

The application code is sufficient for an evidence-backed private demo and for
provider integration work. It is not yet evidence for a live commercial pilot.
The pilot remains blocked until all of the following are recorded:

1. At least one production property source has written authorization and a live,
   approved collection run.
2. Trust Score wording and the public legal disclaimer are approved.
3. The production OpenAI model/key and quality evaluation are approved.
4. A cash-payment provider, merchant policy, refund policy, and production
   credentials are approved and tested.
5. A Cambodia verifier, consultation operator, and at least two real production
   administrators are assigned.
6. The scheduler and alert destination are provisioned.
7. A production backup is restored successfully and its evidence is recorded.
8. Security, privacy, and pilot launch approvals are signed by their named owners.

The `/admin/readiness` page is the operational source of truth for these gates.
