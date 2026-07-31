# GLI Web2 MVP

GLI의 동남아 부동산 AI 탐색, Trust Score, 관심 자산, 상담 신청, 현금
멤버십을 검증하는 Web2 MVP입니다. [vinext](https://github.com/cloudflare/vinext),
Cloudflare D1, Drizzle 기반으로 실행됩니다.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run db:local
npm run dev
npm run build
```

가족용 공개 데모 로그인을 로컬에서 시험할 때만 다음 환경값을 사용합니다.

```text
DATA_MODE=d1
DEPLOYMENT_STAGE=demo
DEMO_AUTH_ENABLED=true
DEMO_ADMIN_ENABLED=true
DEMO_AUTH_HOSTS=localhost,127.0.0.1
```

`wrangler.local.jsonc`는 로컬 D1 마이그레이션에만 사용합니다. Sites 배포
설정은 `.openai/hosting.json`이 담당합니다.

실제 AI 상담 검색은 다음 서버 환경값으로 활성화합니다.

```text
LLM_PROVIDER=openai
OPENAI_API_KEY=<server-secret>
OPENAI_MODEL=gpt-5.6-sol
```

키는 저장소나 브라우저 코드에 넣지 않습니다. AI가 비활성 상태이거나 응답에
실패하면 검색 API는 검증된 규칙 검색으로 자동 복귀합니다. AI는 서버가 고른
후보의 순서와 설명만 다룰 수 있고 Trust Score, 가격, 위치 등 원본 사실값은
수정할 수 없습니다.

## Included Shape

- edit site code under `app/`
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` defines listings, provenance, Trust Score, members, favorites,
  consultations, memberships, and audit logs
- `db/user-workflows.ts` contains the member workflow repository
- `db/membership-billing.ts` owns provider-neutral checkout sessions and
  membership activation
- `db/consultation-operations.ts` owns administrator assignment and the
  consultation status workflow
- `db/consultation-thread.ts` owns member-scoped consultation threads,
  operator replies, and message audit boundaries
- `db/member-notifications.ts` owns member-scoped in-app alerts and idempotent
  read tracking
- `db/operations.ts` contains the approval-gated ingestion, Trust evaluation,
  review, publish, and audit workflow
- `workers/ingestion/index.ts` is the non-public execution boundary for licensed
  partner feeds
- `ingestion/licensed-json-feed.ts` enforces the GLI partner-feed schema,
  approved HTTPS hosts, response limits, immutable raw-object storage, and
  provenance hashes
- `/admin` provides a separate demo operations account and collection workbench
- `/admin/sources/:slug` provides a separate source-approval and licensed-feed
  onboarding workflow, including an authorized partner-file import workbench
- `/api/admin/ingestion/import` sends an exact licensed JSON upload through the
  existing source policy, R2 raw snapshot, normalization, privacy, dedupe, and
  `REVIEW_PENDING` boundaries
- `/admin/audit` provides administrator-only, cursor-paginated audit history
  with workflow filters, recursive secret redaction, and bounded CSV export
- `/admin/readiness` provides evidence-based pilot release gates and
  administrator-recorded backup and restore verification
- `/api/search` provides grounded conversational advice with a deterministic
  fallback, validated multi-turn criteria context, and server-owned Trust data
- `/membership/checkout` exercises plan selection, checkout confirmation, and
  30-day membership activation without collecting card data
- `/my/consultations/:id` and `/admin/consultations/:id` provide separate
  member and operator views of the same consultation history
- `/my` shows unread consultation updates and links each alert back to its
  authorized case page
- `db/payment-webhooks.ts` owns verified, idempotent payment completion,
  expiry, refund, membership-access, and audit transitions
- `db/operations-health.ts` owns operational alerts, health scans, retry
  backoff, and dead-letter isolation
- `db/operations-notifications.ts` owns allowlisted, occurrence-idempotent
  operations alert delivery
- `workers/ingestion/scheduled.ts` is the scheduled-only entrypoint for retry,
  health scanning, and alert delivery
- `/admin` exposes source-approval expiry, collection failures, payment
  failures, delayed consultations, data freshness, and retry status
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from
`oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build the worker and verify domain plus deployed member/admin journeys
- `npm run db:generate`: generate Drizzle migrations after schema changes
- `npm run db:local`: apply all D1 migrations to the local persisted database
- `npm run check`: run lint, migration validation, build, and all tests

The implementation and release evidence for each Web2 requirement is tracked in
[`docs/MVP_COMPLETION_MATRIX.md`](docs/MVP_COMPLETION_MATRIX.md). The matrix
separates verified product behavior from source, payment, staffing, and
production-operation gates that require external approval.

## Demo Auth Boundary

The family demo account is enabled only when all demo environment variables
match the current host. It is a shared, non-production identity and must never
be enabled on a production deployment. It cannot represent payment, wallet, or
administrator authorization.

The operations demo account is separate from the family member account and is
enabled only when `DEMO_ADMIN_ENABLED=true`. It can execute only the approved
internal fixture feed. External portal connectors remain blocked until their
source policy is explicitly approved.

The shared demo administrator can review and simulate source-onboarding form
validation, but the source mutation API rejects demo identities. A real active
administrator must save or suspend an external source. The database stores only
the environment-secret name, never the credential value.

The shared demo administrator can also validate a partner-feed file in the
browser, but cannot import it. A real active administrator and an approved,
unexpired `LICENSED_JSON_V1` source are required before exact uploaded bytes are
stored in R2 and candidate listings enter the private review queue.

The audit center is read-only. It resolves event actors, groups events by
workflow, and redacts secret, token, password, authorization, credential, API
key, private-key, and cookie fields before rendering before/after snapshots.
Invalid legacy JSON is isolated to the affected record.

Audit CSV export applies the same redaction boundary, covers only the latest 30
days, and returns at most 1,000 events. CSV cells are quoted and spreadsheet
formula prefixes are neutralized. Automatic retention deletion remains disabled
until the production retention and legal-hold procedure is approved.

## Full Trust Report Access

The public asset page exposes a bounded Trust summary. The full report is a
separate authenticated route and its evidence query runs only after the server
confirms an unexpired Investor or Private cash membership. Explore members
receive an upgrade response without the full report payload.

The report shows the persisted rule version, Trust run, source count, latest
observation, analyst approval state, limitations, and next verification actions.
It can be printed or saved as a PDF from the browser. It does not claim legal
validity, title safety, investment suitability, or guaranteed returns.

No-charge checkout and activation endpoints are available only when the runtime
is explicitly configured as a demo. A production environment returns
`DEMO_BILLING_DISABLED` until a real payment provider adapter is enabled.

## Conversational Search Context

The advisor keeps the visible conversation in browser memory and sends only the
latest server-issued search criteria with a follow-up question. The API validates
every contextual field, enum, and numeric bound before reusing it. Invalid or
cross-country context fails closed with `INVALID_SEARCH_CONTEXT`.

Follow-up messages can add or replace budget, district, transaction, property
type, bedroom, seasonal-use, short-stay, and river-view preferences. The user can
start a new search at any time. Raw conversation history is not persisted or
replayed to the model by this flow.

## Consultation Threads

Each consultation has a dedicated member page instead of ending at a dashboard
status label. The member can review the original request, follow-up messages,
operator replies, assignment, and status history. The administrator uses a
separate route to reply and advance the case.

Member thread queries always include the authenticated member ID, and operator
queries require an active administrator. Message bodies remain in the
consultation event ledger, while the general audit log records only event type
and body length. Completed and cancelled consultations are read-only to members.

Operator replies and consultation status changes create member-scoped in-app
alerts. The alert contains bounded display text and the consultation link, not
the underlying message body. Reading an alert is ownership-checked, idempotent,
and recorded in the audit log.

## Pilot Release Readiness

The readiness center does not infer launch readiness from feature flags alone.
It checks external-source approval and collection evidence, approved Trust
Reports, AI and payment configuration, critical alerts, dead letters, payment
failures, consultation SLA, scheduled operations, administrator redundancy, and
recent production restoration evidence.

Production runtime gates use boolean configuration only; secret values are never
rendered. The payment and scheduler gates require
`PRODUCTION_PAYMENT_ADAPTER_ENABLED=true` and
`SCHEDULED_OPERATIONS_ENABLED=true` respectively after their real integrations
have been approved. AI requires `LLM_PROVIDER=openai` and a server-side
`OPENAI_API_KEY`.

Backup evidence writes are unavailable to shared demo administrators. A real
administrator records the approved storage object key, manifest SHA-256,
capture time, and restore result. The system stores point-in-time record counts
and writes an audit event; it never stores storage credentials.

## Authorized Partner Feed

The production-ready connector boundary accepts only the versioned
`gli.partner-listings.v1` JSON envelope. A source must be `APPROVED`, use the
configured connector kind, request only permitted fields, target an exact
allowlisted HTTPS host, and remain within its record limit before any network
collection can start.

The ingestion worker stores the received body in the raw-object store and writes
only its object key, hashes, HTTP status, source URL, and timestamps to D1.
Normalized listings remain `REVIEW_PENDING` until an operator publishes them.
Credentials are referenced by environment-secret name and are never written to
D1 or the repository.

The hosted demo uses the `DEMO_CASH` checkout adapter. It stores the same
checkout and audit boundaries needed by a production payment adapter, but
always returns `charged: false`. Do not enable a charging adapter until a
provider contract, production verifier, credentials, and refund policy are
approved.

The production payment boundary is provider-neutral. A selected provider must
implement session creation and signature verification, then return one of the
normalized payment events. Raw webhook bodies are verified before persistence;
only a SHA-256 payload hash and operational event state are stored. Provider
event IDs and provider session IDs are unique, so repeated delivery cannot
activate duplicate memberships. Amount or currency mismatches fail closed.
Refund events end the corresponding cash membership and preserve the audit
trail. No public webhook route is enabled until the provider-specific verifier
and secret are configured.

## Operations Health

The administrator health scan reconciles source-approval expiry, recent
ingestion failures, failed payment events, delayed consultations, and stale
active listings into a deduplicated alert ledger. Operators can acknowledge or
resolve alerts without deleting their history.

Transient licensed-feed failures enter a separate retry queue with bounded
exponential backoff. Jobs that reach their attempt limit move to the
dead-letter state for human review. Source-policy denials are never retried.
The public web process does not execute external retries; a separately
scheduled worker must call the retry executor.

## Scheduled Operations Worker

`wrangler.ingestion.example.jsonc` documents the separate Cloudflare Worker
shape. Copy its values into an environment-specific deployment configuration
only after the real D1 database, R2 bucket, operations administrator, and alert
destination have been approved.

The scheduled worker:

- processes at most `RETRY_JOBS_PER_TICK` queued collection retries
- runs the operations health scan after retry processing
- sends only new or materially changed alerts
- keeps failed notification deliveries pending for the next schedule
- accepts connector credentials only from secrets whose names start with
  `SOURCE_SECRET_`
- sends alerts only to an exact hostname listed in
  `ALERT_WEBHOOK_ALLOWED_HOSTS`

`ALERT_WEBHOOK_URL`, `ALERT_WEBHOOK_BEARER`, and all `SOURCE_SECRET_*` values
must be stored as worker secrets, not committed as configuration variables.

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
