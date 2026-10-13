# GLI Engineering Guide

## User-ordered work sequence (2026-10-12)

- 2026-10-13 design delegation update: Codex may decide small copy, state and
  interaction fixes within the existing approved design without separate Claude
  approval. Log each change. On the next substantial UI redesign, hand these
  changes back to Claude Design for reconciliation. New visual direction, major
  layout/navigation changes and product/payment/access policy still need approval.
  This supersedes blanket Claude preapproval for every small UI correction.

- Follow `docs/implementation/WORK-SEQUENCE.md` in order: finish frontend UI
  and function wiring before improving AI answers. Do not skip ahead or treat
  research advice as implementation approval.
- Proceed through user questions one at a time. Read `CURRENT_STATE.md` for the
  current stage; no product edits until that stage's direction is settled.
- Preserve approved design and use API/DB authority for persisted business
  data. New design/policy/real-service integration and public deployment need
  explicit approval. Record stage progress in `CURRENT_STATE.md` and history.

## GLI AI development workflow (user, 2026-09-30)

- Work on GLI only. Prefer this Work Local tree to GitHub for current code;
  inspect the remote only when divergence, PR/CI, or a pull/merge requires it.
- Search first and read only task-relevant files (initially about 5-10). Skip
  node_modules, builds, caches, logs, backups, old versions, and lockfiles
  unless necessary. Never re-analyze the whole repository by default.
- Make minimal edits; no unrelated refactors or duplicate backup files. On a
  failure, inspect the first real error and nearby log lines. Do not rerun an
  unchanged failing command; after about two failed approaches, revisit the
  problem definition and environment before increasing model effort.
- Verify related tests first, then the needed local build at the task boundary.
  Use established scripts; do not rebuild or deploy after each small change.
  The existing specification/history and definition-of-done rules below remain.
- Current deployment is the GPT site. Firebase DEV/TEST is a future migration:
  verify its project, configuration, and scripts before any deployment. Never
  change, merge, or deploy Production without explicit user instruction.
- Default model recommendation: Sol for ordinary implementation, fixes, APIs,
  Firebase DEV/TEST, UI, tests, builds, and reviews. Prefer cheaper models for
  mechanical search, log filtering, simple Git, and fixed procedures. Recommend
  Astra only for new core architecture, cross-service failures, failed Sol
  approaches, major migration/technology choices, or intertwined security,
  authority, financial/RWA, and data constraints. File count and log length
  alone do not justify Astra. Prefer small context + Sol; recommend only when
  materially useful and continue the task.
- Use `AI_CONTEXT.md` for stable facts and root `CURRENT_STATE.md` for a short
  current snapshot. Update relevant specifications and append-only history at
  task completion. Stop when the requested unit is verified.

## Start here: executable development specification

- Named web delegation: "미니" = Gemini, "로드" = Claude. When the user asks
  to assign work, use `skills/gli-web-delegation/SKILL.md` (also installed as a
  user skill). Use the existing relevant in-app conversation, minimum context,
  no secrets, and independent review. These are web collaborators, not GLI
  product API calls or internal Codex subagents; registration sends no task.

- Read `docs/implementation/README.md`, `CURRENT-STATE.md`, and `DECISIONS.md`
  before interpreting historical completion claims. `registry.json` connects
  current behavior, unfinished work, code evidence, dependencies and acceptance.
- Update the affected GS feature and evidence when behavior changes. Preserve
  historical GLI task IDs and ADRs; a past COMPLETE is not proof of live readiness.
- Every development task must update the relevant specification and append an
  entry to `docs/implementation/HISTORY.md` in the same delivery. This includes
  fixes, UI integrations, data/source changes, configuration, deployments and
  documentation work. Record before/after behavior, reason/approval basis,
  affected GS/GLI IDs, files, verification, remaining work and deployment state.
- If a task has no product/API/data contract impact, explicitly record that
  finding in history; do not churn unrelated specifications. Preserve old
  decisions and history entries, adding superseding/correction entries instead
  of erasing them. Never record an unmade commit or deployment as completed.
- Claude owns approved design. Apply only user-approved improvements; keep
  copy, fonts, colors, spacing, DOM and responsive behavior faithful. The later
  selective-adoption decision supersedes blindly copying an entire new handoff.
- Distinguish public fixture/Map discovery from durable D1/R2 ingestion. Cambodia
  has listing discovery adapters; P45 enables bounded Dot Property Vietnam
  listing discovery for LOCAL/explicit demo only; P47 adds Dot Philippines.
  Homedy mapping, Batdongsan
  access and P44 auxiliary sources remain held. Partner cards are not crawlers.
  Demo approval is not model-training or commercial reuse permission.
- Run `npm run spec:check` for documentation/link verification. Use
  `npm run spec:refresh` after changing the registry or route inventory.
- For documentation and comment-only work, use the spec check and diff review;
  do not regenerate visual artifacts unnecessarily. Runtime changes still require
  the existing build/lint/relevant-test checks below.

## Product boundary

- Build the blockchain-free Web2 MVP first.
- Cash membership is global and account-scoped.
- GLI Cash is a non-transferable prepaid platform balance for asset access,
  travel products, and future convenience services. It is not a coin, reward,
  deposit, staking product, or investment return in the Web2 MVP.
- Asset-specific Premium and Business access uses GLI Cash in the product model.
  Unlocking a higher asset tier also unlocks every lower tier for that asset.
- Keep GLI Cash provider-neutral so a later token payment rail can coexist with
  it without changing the Web2 entitlement model.
- Asset-specific programs are available only for GLI Direct or GLI-curated assets.
- GLIB staking, GLID rewards, wallet flows, DAO, IPFS, and on-chain claims are not production Web2 features.
- The five-level asset-detail screen is a demonstrative UI until GLI approves
  category-specific content, price, duration, service, and evidence matrices.
- Never present simulated verification, returns, legal status, or live data as confirmed facts.

## Architecture

- New discovery countries must update `lib/discovery-countries.ts`, connect a
  bounded collector, and test source/country/FX boundaries. Broad search and
  Gemini scope derive from that registry. Never suppress external scouting
  because stored candidates already satisfy a count threshold (P56).

- Preserve the existing vinext, Next.js App Router, Cloudflare Sites, npm, and lockfile setup.
- Use D1 for structured product data and R2 for raw snapshots, evidence, and reports.
- Keep crawling and normalization isolated from public request handlers.
- Keep internal Trust calculation deterministic and server-side. The public UI
  uses Trust Grade (8 grades), distinct from 5 asset-access tiers. AI may explain
  stored evidence but may not invent verification or modify a stored grade.
- Preserve source provenance internally and show the approved public source name
  with a direct original-listing link for externally collected assets. Never
  invent attribution for fixtures or GLI-curated assets.

## Working rules

- Read `docs/PM_BOARD.md` and the relevant ADR before editing.
- One task has one writer. Do not edit files owned by another active task.
- Use `apply_patch` for manual edits.
- Add or update tests for behavior changes.
- Run `npm run check` before marking a task done.
- Do not commit secrets, real payment data, private contact data, or unapproved source content.
- Do not enable a production collector unless its `sources.approval_status` is `APPROVED`.

## Definition of done

- Relevant specifications and registry evidence are current, an append-only
  history entry exists, and `npm run spec:check` passes. Code changes alone do
  not complete a task. When committing, include its code and documentation
  together; preserve the user's separate publication approval requirements.
- The acceptance criteria in the task card are met.
- Build, lint, and relevant tests pass.
- Mobile and desktop behavior is considered.
- API and database changes include contracts and migrations.
- Error, empty, loading, and unauthorized states are handled.
- The handoff names changed files, tests run, assumptions, and remaining risks.
