# GLI Engineering Guide

## Product boundary

- Build the blockchain-free Web2 MVP first.
- Cash membership is global and account-scoped.
- Asset-specific programs are available only for GLI Direct assets.
- GLIB staking, GLID rewards, wallet flows, DAO, IPFS, and on-chain claims are not production Web2 features.
- Never present simulated verification, returns, legal status, or live data as confirmed facts.

## Architecture

- Preserve vinext, Next.js App Router, Cloudflare Sites, npm, and the lockfile.
- Use D1 for structured product data and R2 for raw snapshots, evidence, and reports.
- Keep crawling and normalization isolated from public request handlers.
- Keep Trust Score calculation deterministic and server-side. AI may explain a stored result but may not create or modify it.
- Keep source provenance internally even when the end-user UI does not emphasize the upstream portal.

## Working rules

- Read `docs/PM_BOARD.md` and the relevant ADR before editing.
- One task has one writer. Do not edit files owned by another active task.
- Add or update tests for behavior changes.
- Run `npm run check` before marking a task done.
- Do not commit secrets, real payment data, private contact data, or unapproved source content.
- Do not enable a production collector unless its source approval status is `APPROVED`.

## Definition of done

- Acceptance criteria are met.
- Build, lint, and relevant tests pass.
- Mobile and desktop behavior is considered.
- API and database changes include contracts and migrations.
- Error, empty, loading, and unauthorized states are handled.
- The handoff names changed files, tests, assumptions, and remaining risks.
