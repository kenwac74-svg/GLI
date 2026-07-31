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
| Normalized property model | VERIFIED | D1 migrations `0000`-`0009`, `db/schema.ts`, normalization and repository tests | Expand mappings when a licensed source contract is received |
| Provenance and immutable source snapshots | VERIFIED | `ingestion/feed-worker.ts`, R2 snapshot contract, listing versions, audit records, ingestion tests | Production R2 binding and retention approval |
| Source authorization boundary | VERIFIED | source policy registry, allowlisted HTTPS hosts and fields, expiry/suspension checks, admin source UI and tests | None for the boundary itself |
| Live external Cambodia sources | EXTERNAL GATE | Readiness gate and PM tasks GLI-002, GLI-005, GLI-010, GLI-013 remain open | Written permission or partner feed for each production source, credentials, permitted fields |
| Conversational property search | VERIFIED | `/api/search`, intent extraction, district-aware filtering, validated multi-turn criteria context, deterministic fallback and rendered-worker tests | None for rules mode |
| Grounded LLM advisor | TECHNICALLY READY | `lib/ai-search.ts`, OpenAI adapter validation, grounded citation tests, unsafe-output fallback | Hosted OpenAI key, model approval, production evaluation |
| Trust Score | VERIFIED | deterministic versioned rules, evidence dimensions, non-guarantee language, Trust tests | Public wording and legal disclaimer approval before pilot |
| Trust review and publication | VERIFIED | ingestion review queue, administrator review API, publication audit trail and tests | Named GLI analyst/verifier for live operation |
| Full Trust Report access | VERIFIED | separate private report API/page, Investor/Private server entitlement, Explore paywall, evidence-only content and print/PDF UX | Legal wording approval and live analyst-approved reports |
| Account and MY GLI | VERIFIED | authenticated user creation, favorites, consultations, membership dashboard, `/my`, built-worker E2E test | Production identity policy and account support owner |
| Cash membership product | VERIFIED | separate `/membership` and checkout routes, global account-level plans, Investor/Private report entitlement, demo no-charge activation | None for the product model |
| Real cash payment | TECHNICALLY READY | provider-neutral checkout adapter, signed webhook ledger, idempotency, refund access termination and tests | Provider selection, merchant account, credentials, refund policy, certification |
| Consultation workflow | VERIFIED | member intake, asset-linked/general requests, assignment and status transitions, admin operations and tests | Named Cambodia consultation operator and SLA |
| Administrator control center | VERIFIED | sources, ingestion/review, consultation operations, alerts, audit center, CSV export and readiness center | Production administrators and least-privilege assignment |
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
3. The member can submit an asset-linked consultation.
4. A priced cash-membership checkout is created and confirmed without a demo charge.
5. MY GLI returns the saved asset, consultation, and active global membership.
6. The rendered MY GLI page contains the resulting asset and plan.
7. A non-admin cannot export audit history.
8. An administrator can record backup/restore evidence and export redacted audit CSV.
9. The administrator readiness page renders from the migrated database.

The full `npm run check` gate currently covers lint, migration validation,
production build, and 95 automated tests.

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
