# 현재 API와 실서비스 연결 계약

[openapi.json](openapi.json)은 현재 `POST /api/search`, `GET /api/assets`의 부분 명세다. 프로젝트 전체 OpenAPI 완료본이 아니다. 모든 실제 route 파일은 [ROUTES.md](ROUTES.md)에 기계적으로 기록한다. 현재 명세와 향후 제안을 혼합해 구현되지 않은 endpoint를 호출하지 않는다.

## 현재 검색

- body: `query`(trim 이후 1~800자), 선택적 `context`(SearchCriteria 전체), 선택적 `conversation`(최대 8턴; user/assistant; 각 trim 이후 1~1200자).
- 잘못된 JSON/query/context/conversation은 400과 `{error:{code,message}}`.
- context는 국가 4개, 도시/구역 null 또는 1~80자, transaction sale/rent/null, 예산 범위와 purpose/boolean 필드를 검증한다. 정확한 조건은 `parseSearchContext`.
- response: answer, clarification, criteria, matches, rate, citations, advisor, orchestration, membershipAccess, dataMode, discovery.
- advisor mode는 공개 `ai` 또는 `rules`. provider/model/key는 공개 응답에서 제거한다.
- discovery의 collectedCount/displayedCount는 해당 실행 표본이며 포털 전체 재고가 아니다.
- 동기식 JSON 완료 응답이다. 타이머 UI는 job progress API가 아니다.

현재 `GET /api/assets`는 transaction와 direct만 처리하고 최대 100건을 반환한다. country/city/category/page query가 자동으로 지원된다고 가정하지 않는다.

## 다른 현재 경계

| 영역 | 읽어야 할 구현 | 주의 |
|---|---|---|
| 환율 | app/api/exchange-rates/route.ts | snapshot/stale, 실패 503. 검색 고정 환율과 아직 분리 |
| 로그인/회원 | app/auth.ts, app/api/me/route.ts | ChatGPT 호스팅/데모와 AWS 독립 인증은 별개 |
| 관심 | app/api/favorites/route.ts | DB API와 새 목업 UI 연결 여부를 따로 시험 |
| 상담 | app/api/consultations/route.ts, consultations/[id]/messages | 사용자 소유권/관리자 역할 |
| 결제 | app/api/memberships/checkout, checkout/confirm, db/payment-webhooks.ts | 공개 confirm handler가 실 PG webhook 수신기라는 뜻 아님 |
| 관리자 | app/api/admin | 일부 기존 서비스 재사용, 샘플 기반 최종 도구 미완 |

## 실서비스 adapter 계약 제안

아래 인터페이스는 구현 순서를 정하는 설계이며 export된 코드가 아니다. 현재 D1 query adapter를 읽고 최소 변경으로 구체화한다.

| 경계 | 책임 | demo→production 치환 |
|---|---|---|
| AssetRepository | 공개 후보 필터/ID 조회/원문 upsert | fixture/Map/D1 → PostgreSQL |
| SourceCollector | source별 discover/fetchCurrent | 현재 3개 → 국가별 collector 추가 |
| EvidenceStore | 원문 bytes/hash/공개 여부 | public no-op 및 R2 → 실제 저장소/S3 |
| SearchJobService | 생성/조회/취소/부분 결과/재시도 | 동기 request → queue/worker |
| AdvisorService | canonical criteria+evidence → grounded answer | Gemini/OpenAI → 역할별 adapter |
| IdentityService | stable member ID/role | 호스팅/demo → 독립 인증 |
| EntitlementService | 회원/자료권/사용량 | 데모 UI → 서버 authoritative |
| PaymentGateway | checkout/서명 이벤트/환불 | 가상 승인 → PG sandbox/live |
| ContentRepository | public news/revisions/media | 하드코딩 → CMS DB |

## 비동기 탐색 목표

후속 설계 후보는 `POST /api/search/jobs`, `GET /api/search/jobs/{id}`, `DELETE /api/search/jobs/{id}`와 progress stream이다. **현재 route가 없다.** URL 확정 전에 기존 UI에 붙이지 않는다.

각 job은 requestId, member/anonymous scope, criteriaVersion, sourceRuns, 현재 상태, 결과 ID/순서, 오류 코드, 비용 한도, created/finished 시각을 가진다. 같은 원문 upsert는 source ID 기반이다. 조회/취소는 소유자 범위로 제한하고 이전 요청의 늦은 결과가 새 대화를 덮지 못하도록 request ID를 비교한다.

## 계약 유지 시험

같은 fixture를 현재 repository와 이식 adapter에 입력해 필터, 원통화 범위, nullable 상태, 원문 ID, 소유권, 권한, 순서를 비교한다. 외부 모델은 모의 응답을 기본으로 하고 실제 유료 호출은 별도 통합시험으로 기록한다. OpenAPI 파일이 존재하는 것과 endpoint가 그 계약에 맞게 실행된 것은 별도의 검증이다.
