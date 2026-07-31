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
- `db/operations.ts` contains the approval-gated ingestion, Trust evaluation,
  review, publish, and audit workflow
- `/admin` provides a separate demo operations account and collection workbench
- `/api/search` provides grounded conversational advice with a deterministic
  fallback and server-owned Trust data
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
- `npm test`: build the starter and verify its rendered loading skeleton
- `npm run db:generate`: generate Drizzle migrations after schema changes
- `npm run db:local`: apply all D1 migrations to the local persisted database
- `npm run check`: run lint, migration validation, build, and all tests

## Demo Auth Boundary

The family demo account is enabled only when all demo environment variables
match the current host. It is a shared, non-production identity and must never
be enabled on a production deployment. It cannot represent payment, wallet, or
administrator authorization.

The operations demo account is separate from the family member account and is
enabled only when `DEMO_ADMIN_ENABLED=true`. It can execute only the approved
internal fixture feed. External portal connectors remain blocked until their
source policy is explicitly approved.

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
