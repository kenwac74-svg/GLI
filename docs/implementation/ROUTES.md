# 경로 인벤토리

app/page.tsx 및 app/api route 파일에서 생성. 경로 존재는 UI 연결 또는 운영 완료의 증거가 아니다.

새 메뉴의 MY GLI·문의·가이드 등은 coming-soon으로 연결된다. 내부 /my 또는 /admin 구현과 별도로 검증한다.

| 경로 | 종류/메서드 | 구현 | 기능 연결 |
|---|---|---|---|
| `/about` | page | [app/about/page.tsx](../../app/about/page.tsx) | GS-001 |
| `/admin/audit` | page | [app/admin/audit/page.tsx](../../app/admin/audit/page.tsx) | GS-021 |
| `/admin/consultations/[id]` | page | [app/admin/consultations/[id]/page.tsx](../../app/admin/consultations/[id]/page.tsx) | 관련 상위 기능/API 코드 확인 |
| `/admin/listings/[publicId]` | page | [app/admin/listings/[publicId]/page.tsx](../../app/admin/listings/[publicId]/page.tsx) | GS-021 |
| `/admin` | page | [app/admin/page.tsx](../../app/admin/page.tsx) | GS-021 |
| `/admin/readiness` | page | [app/admin/readiness/page.tsx](../../app/admin/readiness/page.tsx) | 관련 상위 기능/API 코드 확인 |
| `/admin/sources/[slug]` | page | [app/admin/sources/[slug]/page.tsx](../../app/admin/sources/[slug]/page.tsx) | GS-021 |
| `/api/admin/audit/export` | GET | [app/api/admin/audit/export/route.ts](../../app/api/admin/audit/export/route.ts) | 관련 상위 기능/API 코드 확인 |
| `/api/admin/consultations/[id]/messages` | POST | [app/api/admin/consultations/[id]/messages/route.ts](../../app/api/admin/consultations/[id]/messages/route.ts) | 관련 상위 기능/API 코드 확인 |
| `/api/admin/consultations` | PATCH | [app/api/admin/consultations/route.ts](../../app/api/admin/consultations/route.ts) | 관련 상위 기능/API 코드 확인 |
| `/api/admin/ingestion/demo` | POST | [app/api/admin/ingestion/demo/route.ts](../../app/api/admin/ingestion/demo/route.ts) | 관련 상위 기능/API 코드 확인 |
| `/api/admin/ingestion/import` | POST | [app/api/admin/ingestion/import/route.ts](../../app/api/admin/ingestion/import/route.ts) | 관련 상위 기능/API 코드 확인 |
| `/api/admin/listings/review` | POST | [app/api/admin/listings/review/route.ts](../../app/api/admin/listings/review/route.ts) | 관련 상위 기능/API 코드 확인 |
| `/api/admin/operations/alerts` | PATCH | [app/api/admin/operations/alerts/route.ts](../../app/api/admin/operations/alerts/route.ts) | 관련 상위 기능/API 코드 확인 |
| `/api/admin/operations/health` | POST | [app/api/admin/operations/health/route.ts](../../app/api/admin/operations/health/route.ts) | 관련 상위 기능/API 코드 확인 |
| `/api/admin/readiness/ai-evaluation` | POST | [app/api/admin/readiness/ai-evaluation/route.ts](../../app/api/admin/readiness/ai-evaluation/route.ts) | 관련 상위 기능/API 코드 확인 |
| `/api/admin/readiness/backups` | POST | [app/api/admin/readiness/backups/route.ts](../../app/api/admin/readiness/backups/route.ts) | 관련 상위 기능/API 코드 확인 |
| `/api/admin/sources` | PUT, PATCH | [app/api/admin/sources/route.ts](../../app/api/admin/sources/route.ts) | 관련 상위 기능/API 코드 확인 |
| `/api/assets/[id]/trust-report` | GET | [app/api/assets/[id]/trust-report/route.ts](../../app/api/assets/[id]/trust-report/route.ts) | 관련 상위 기능/API 코드 확인 |
| `/api/assets` | GET | [app/api/assets/route.ts](../../app/api/assets/route.ts) | 관련 상위 기능/API 코드 확인 |
| `/api/auth/demo` | POST | [app/api/auth/demo/route.ts](../../app/api/auth/demo/route.ts) | GS-020 |
| `/api/auth/logout` | GET | [app/api/auth/logout/route.ts](../../app/api/auth/logout/route.ts) | GS-020 |
| `/api/consultations/[id]/messages` | POST | [app/api/consultations/[id]/messages/route.ts](../../app/api/consultations/[id]/messages/route.ts) | GS-022 |
| `/api/consultations` | POST | [app/api/consultations/route.ts](../../app/api/consultations/route.ts) | GS-022 |
| `/api/exchange-rates` | GET | [app/api/exchange-rates/route.ts](../../app/api/exchange-rates/route.ts) | GS-013 |
| `/api/favorites` | POST, DELETE | [app/api/favorites/route.ts](../../app/api/favorites/route.ts) | GS-016 |
| `/api/me` | GET | [app/api/me/route.ts](../../app/api/me/route.ts) | GS-020 |
| `/api/memberships/checkout/confirm` | POST | [app/api/memberships/checkout/confirm/route.ts](../../app/api/memberships/checkout/confirm/route.ts) | GS-018 |
| `/api/memberships/checkout` | POST | [app/api/memberships/checkout/route.ts](../../app/api/memberships/checkout/route.ts) | GS-018 |
| `/api/memberships/demo` | POST | [app/api/memberships/demo/route.ts](../../app/api/memberships/demo/route.ts) | 관련 상위 기능/API 코드 확인 |
| `/api/notifications/[id]/read` | PATCH | [app/api/notifications/[id]/read/route.ts](../../app/api/notifications/[id]/read/route.ts) | 관련 상위 기능/API 코드 확인 |
| `/api/search` | POST | [app/api/search/route.ts](../../app/api/search/route.ts) | GS-002 |
| `/assets/[id]` | page | [app/assets/[id]/page.tsx](../../app/assets/[id]/page.tsx) | GS-015 |
| `/assets/[id]/trust-report` | page | [app/assets/[id]/trust-report/page.tsx](../../app/assets/[id]/trust-report/page.tsx) | 관련 상위 기능/API 코드 확인 |
| `/coming-soon` | page | [app/coming-soon/page.tsx](../../app/coming-soon/page.tsx) | GS-024 |
| `/explore` | page | [app/explore/page.tsx](../../app/explore/page.tsx) | GS-001 |
| `/favorites` | page | [app/favorites/page.tsx](../../app/favorites/page.tsx) | GS-016 |
| `/membership/checkout` | page | [app/membership/checkout/page.tsx](../../app/membership/checkout/page.tsx) | GS-018 |
| `/membership` | page | [app/membership/page.tsx](../../app/membership/page.tsx) | GS-017 |
| `/my/consultations/[id]` | page | [app/my/consultations/[id]/page.tsx](../../app/my/consultations/[id]/page.tsx) | GS-022 |
| `/my` | page | [app/my/page.tsx](../../app/my/page.tsx) | GS-020 |
| `/news/[id]` | page | [app/news/[id]/page.tsx](../../app/news/[id]/page.tsx) | GS-023 |
| `/news` | page | [app/news/page.tsx](../../app/news/page.tsx) | GS-023 |
| `/notices` | page | [app/notices/page.tsx](../../app/notices/page.tsx) | GS-024 |
| `/` | page | [app/page.tsx](../../app/page.tsx) | GS-001 |
| `/whitepaper` | page | [app/whitepaper/page.tsx](../../app/whitepaper/page.tsx) | GS-024 |

총 46개 route 파일.
