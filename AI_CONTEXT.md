# GLI AI Context

Stable repository facts only. For current work, read `CURRENT_STATE.md` and the
relevant feature specification; do not replay the full chat or history.

## Product and repository

- GLI is a Web2 MVP for Southeast Asian property discovery, evidence-backed
  Trust Grade, consultation, membership, and member/admin workflows.
- This Git repository is `gli-public-site`. GitHub remote `github` points to
  `kenwac74-svg/GLI`; the GPT Sites remote is `sites`. Local `main` exists and
  CI runs on `main`; the GitHub default branch has not been verified remotely.
- Stack: Node.js >=22.13, TypeScript, React 19, Next.js App Router via vinext,
  Cloudflare D1/R2, Drizzle, and npm. Keep the existing lockfile/toolchain.
- Main directories: `app/` UI/API, `lib/` domain/search/AI, `db/` data access,
  `drizzle/` migrations, `ingestion/` and `workers/` collection, `tests/`,
  `design-handoff/` approved Claude design source, `docs/implementation/` specs.

## Environments and commands

- LOCAL: `npm run db:local`, `npm run dev`; local D1 uses
  `wrangler.local.jsonc`. Do not treat a running local preview as deployment.
- Current hosted demo: GPT site configured by `.openai/hosting.json` with D1
  `DB` and R2 `FILES`. No public deployment command is declared in `package.json`.
- Firebase DEV/TEST: planned migration, not the current host. No `firebase.json`,
  `.firebaserc`, or verified Firebase build/deploy command exists in this repo.
  Keep DEV and TEST separate when configured; do not infer project IDs.
- PRODUCTION: future, separately approved deployment. No production action
  without explicit user instruction; older docs also track GCP/AWS phases.
- Checks: `npm run spec:check` (docs), `npm run lint`,
  `npm run typecheck`, `npm run db:validate`, `npm run build`, and
  `npm run check` (full task-boundary gate). Use related tests first.

## Services and boundaries

- `/api/search` joins member access, validated consultation intent, asset
  collection/filtering, and grounded answers. Gemini is a separate discovery/
  translation API; OpenRouter Astra handles configured consultation paths.
- Cambodia has external discovery adapters. P45/P47 add bounded Dot Property
  Vietnam/Philippines listings to demo search/detail; auxiliary sources remain deferred.
  Homedy/Batdongsan and Lamudi/Rentpad access remain held. Source prices retain VND/PHP;
  budget matching requires observed FX (VND/PHP). Map records are not D1/R2 persistence.
- P50 adds opt-in D1 discovered-candidate storage before translation and detail
  recovery. See DURABLE-DISCOVERY.md; raw bodies/backups/public rollout remain open.
- Trust calculation, price/permission checks, source approval, publishing,
  membership, and admin authority remain server-owned. API keys stay server-side.
- Start at `docs/implementation/README.md`; use its `CURRENT-STATE.md`,
  `DECISIONS.md`, `registry.json`, and `HISTORY.md` only as relevant.
