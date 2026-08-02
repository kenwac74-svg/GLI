# GLI Engineering Guide

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

- Preserve the existing vinext, Next.js App Router, Cloudflare Sites, npm, and lockfile setup.
- Use D1 for structured product data and R2 for raw snapshots, evidence, and reports.
- Keep crawling and normalization isolated from public request handlers.
- Keep Trust Score calculation deterministic and server-side. AI may explain a stored result but may not create or modify it.
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

- The acceptance criteria in the task card are met.
- Build, lint, and relevant tests pass.
- Mobile and desktop behavior is considered.
- API and database changes include contracts and migrations.
- Error, empty, loading, and unauthorized states are handled.
- The handoff names changed files, tests run, assumptions, and remaining risks.
