# 현재 API와 실서비스 연결 계약

[openapi.json](openapi.json)은 현재 `POST /api/search`, `GET /api/assets`, `GET /api/discovery/vietnam`의 부분 명세다. 프로젝트 전체 OpenAPI 완료본이 아니다. 모든 실제 route 파일은 [ROUTES.md](ROUTES.md)에 기계적으로 기록한다. 현재 명세와 향후 제안을 혼합해 구현되지 않은 endpoint를 호출하지 않는다.

## 현재 검색

### 관리자 수동 입력 P51

`POST /api/admin/manual-assets`: 동일 Origin JSON `{requestKey: string(16~80 alphanumeric/hyphen), asset: {...}}`. 실제 로그인 ACTIVE ADMIN만 가능, 데모 계정403. 본문16KB 상한. 필수 country/city/transaction/propertyType/title/summary/price/currency/areaSqm, 선택 district/bedrooms/bathrooms/sourceUrl/imageUrl. 기존 normalize 검증/비공개 연락처 차단을 재사용한다. 응답201 `{draft:{id,actorUserId,status:"REVIEW_PENDING",payload,createdAt}}`; 같은 키/같은 입력 재시도는 동일 초안, 다른 입력은400. 검증 실패400, 비로그인401, Origin/권한403. 저장/감사 실패500. 일반 사용자 공개 게시 API가 아니다. 목록은 관리자 페이지에서 서버 repository로 읽는다.

P50: 활성 D1 discovery 저장 경로는 번역 전 정규화 후보를 저장하고 요청 국가의 저장 재고를 병합한다. `discovery.storage`에 `{mode: "d1" | "disabled", savedCount: number}`를 반환한다. `collectedCount`는 저장 재고가 아닌 이번 수집 결과 수다. 기존 `/api/discovery/vietnam`도 같은 storage 필드를 반환한다. 상세/후속 참조는 D1 우선이며 관측일은 게시일과 별개다. 저장 실패는 오류 응답이다. [계약·상한·활성 조건](DURABLE-DISCOVERY.md).

### 2026-09-30 제한적 Jev 분기

- OpenRouter 자격이 있는 첫 질문 중 서버 규칙으로 매입/임차가 미확정이고, 명시 지역과 자산 탐색 표현이 있는 짧은 요청에서만 Jev 결정을 최대 1회 호출한다. 숫자/금액 또는 명시된 투자·거주·임차 단서가 있는 질문, 후속 질문, 자격 없는 요청에는 추가 호출이 없다. 모델 오류/낮은 확신은 기존 Astra 해석으로 복귀한다.
- 확실한 모호성만 `consultation.mode=clarify`, `matches=[]`, `resultSet.returnedCount=0`, 한 가지 매입/임차 확인 질문으로 반환한다. 외부 수집/상담 생성 모델은 호출하지 않는다. 다음 턴은 기존 `context`로 이어진다. 응답의 `orchestration.stages`는 실제 수행한 요청 이해 단계만 포함한다.
- 내부 단계명 `decision`을 기존 요청별 운영 원장에 추가했다. OpenRouter `/api/alpha/decisions`와 고정 모델 `typesafe/jev-1.13`을 서버에서만 사용한다. 한 요청의 유료 단계 상한은 선택적 분기를 포함해 10회이며 자동 재시도는 없다. `GLI_JEV_ROUTING=disabled`는 이 분기만 끈다. 공개 키/모델 선택권은 없다.
- 이 기능은 확인 질문을 통한 잘못된 탐색 방지에 한정된다. 매물 선별·수익 산술·추천 검증을 Jev에 위임하지 않는다. 0.95 선택 확률/0.85 집중도는 보수적인 초기 안전값으로, GLI 실질문 검증 전에는 정확도 보증이나 비용·지연 개선 수치로 사용하지 않는다.

### 2026-09-23 운영 보호와 취소

- P38: 보호된 검색 요청의 첫 유료 호출 직전에 전체 300/일·계정 100/일을 D1 단일 조건부 INSERT로 확보한다(Asia/Seoul). 비로그인은 현재 공통 풀 100/일이다. 원장 불가/한도 초과 시 후속 유료 처리를 하지 않는다. [정확한 계량·한계](AI-OPERATING-GUARD.md).
- 응답에 `operationalAccess: {limited:boolean, unavailable:boolean}`을 추가했다. 내부 사용량/모델/비용은 노출하지 않는다. 기존 UI와 문구는 유지하며 별도 경고 UI는 미승인이다. 제한/장애 시 기존 규칙·캐시 응답을 반환한다.
- 클라이언트 이탈/탐색 전환 시 AbortController로 취소하고 서버 request.signal을 모든 유료 fetch에 합성한다. 서버가 이탈을 통지받으면 다음 유료 단계를 시작하지 않는다. 전송망이 signal을 전달하지 못하는 경우까지 보장하지 않으며 비동기 job cancel API는 아직 없다. 취소된 route는 가능한 경우 499, 고객 미전달 상담 카운터는 복구하되 운영 원장은 남긴다.
- 목록/상세의 번역은 캐시 전용이다. 새 번역은 검색에서 보호된 fetch를 전달할 때만 수행한다. 캐시 미수신/실패는 기존 정책대로 원문을 유지한다.

### 2026-09-18 외부 매물 한국어 표시

- `POST /api/search` body의 선택적 `locale`, `GET /api/assets?locale=`는 `ko`, `ko-KR`, `en`, `en-US`를 허용한다. 생략 시 현재 UI 기준 한국어. 그 외는 400 `INVALID_LOCALE`.
- 검색 응답 `locale`은 `ko`/`en`. 검색 원문 필터 후 실제 반환 후보의 제목·요약·핵심 설명만 번역하며 동일 표시값을 상담 근거와 citations에 전달한다. 이전 후보 참조는 서버 원문 재조회 후 같은 번역 캐시를 적용한다.
- `/assets/:id`의 외부 자산 상세도 같은 한국어 번역을 사용한다. 가격·통화·면적·URL·ID·등급·순서는 번역 단계에서 변경하지 않는다. 번역 실패 시 원문으로 정상 반환한다. 번역 서비스/보존 경계는 PRODUCT-DATA의 GS-033을 따른다.
- 기존 언어 UI를 새로 구현하거나 전체 상담/페이지를 영어로 바꾸는 변경은 아니다. `en`은 외부 자산 원문 선택용 계약이다. 공개 응답에 모델/키/번역 저장소 경로를 넣지 않는다.

- body: `query`(trim 이후 1~800자), 선택적 `context`(SearchCriteria 전체), 선택적 `conversation`(최대 8턴; user/assistant; 비어 있지 않은 각 턴 최대 32,000자). 재전송/모델 입력은 턴당 1,200자 이내의 앞·뒤 문맥 발췌다. 화면 전문과 criteria/후보 ID는 자르지 않는다. 별도 AI 요약 호출은 없다.
- 잘못된 JSON/query/context/conversation은 400과 `{error:{code,message}}`.
- context는 국가 4개, 도시/구역 null 또는 1~80자, transaction sale/rent/null, 예산 범위와 purpose/boolean 필드를 검증한다. 정확한 조건은 `parseSearchContext`.
- response: answer, clarification, criteria, matches, rate, citations, advisor, orchestration, membershipAccess, dataMode, discovery.
- 2026-10-01: 조회 성공한 FX는 `rate:{krwPerUsd,asOf,rates?}`로 반환한다. 선택적 rates는 USD 기준 지원 통화별 비율이며 VND 등 원통화의 KRW 표시에도 사용한다. `matches.price/currency`는 원 가격/통화 그대로다. 상담 근거 후보에는 기존 `priceUsdReference`도 전달한다. 환율 공급자가 없으면 원 가격을 유지하며 임의 VND 환율을 만들지 않는다. 규칙 KRW 예산 입력 해석의 고정 demo 값은 별도 미완료다.
- OpenRouter 내부 상담 입력에도 관측된 `exchangeRate`와 결정적으로 계산한 후보별 `priceKrwReference:{amount,maxAmount,currency:"KRW",asOf}` 및 한국어 `locationLabel`을 전달한다. demo-reference/환율 미제공/해당 통화 미제공은 KRW 근거로 승격하지 않는다. 계산값은 제시 가격 환산이며 총비용/확정 계약가/순수익 검증이 아니다. 공개 API에 내부 공급사 정보는 추가하지 않는다.
- advisor mode는 공개 `ai` 또는 `rules`. provider/model/key는 공개 응답에서 제거한다. OpenRouter 내부 실패 코드, 사용량/비용, 실제 제공자/모델도 이 공개 객체에 넣지 않는다.
- discovery의 collectedCount/displayedCount는 해당 실행 표본이며 포털 전체 재고가 아니다.
- 동기식 JSON 완료 응답이다. 타이머 UI는 job progress API가 아니다.
- OpenRouter 모델은 서버 설정으로만 고른다. 요청 body로 model/key/preparedSearch를 전달해도 선택권을 주지 않는다. `preparedSearch`는 서버 검증 의도로 조회한 결과 또는 내부 비교 도구의 고정 입력이다.
- OpenRouter는 90초 제한, 출력/추론 합산 상한 8192 tokens, medium 요청, 제공자 fallback 없음으로 호출한다. `data_collection=deny`는 제공자 학습 사용 제약이며 무보관/ZDR 전체 보장을 뜻하지 않는다.
- OpenRouter/OpenAI 로컬 무료 미리보기는 비운영 + loopback + 명시 플래그가 필요하다. 공개 비로그인 체험 할당량/보호 정책은 후속 구현한다. Gemini의 기존 개발 미리보기 및 별도 discovery 경로는 유지한다.
- OR 상담은 유효 이용권/로컬 허용 확인 후 `interpretConsultation`을 먼저 실행한다(30초/4096 tokens). 검증한 동일 criteria를 수집·필터·advisor에 전달한다. 의도 실패 시 기존 규칙 해석으로 복귀하며 이를 내부 상태에서만 구별한다. 최종 advisor 실패는 기존 1회 사용량 반환 정책을 따른다. 의도 호출 비용이 실제 발생했을 수 있으므로 이는 금전 환불이 아니다.
- 선택적 `criteria.consultation`과 `context.consultation`: budget `{amount,currency:KRW|USD,scope:purchase|monthlyRent|totalInvestment}` 또는 null; targetMonthlyIncome `{amount,currency:KRW|USD,basis:gross|net|unspecified}` 또는 null; completedOnly/tenantedOnly/furnishedOnly/cashPurchase boolean. 금액은 유한 양수이며 정해진 최대값 이내. 미지원 통화 처리/영속 상담 상태는 후속 확장.
- 목표 월수입은 매매가 상한으로 사용하지 않는다. 총예산은 비용을 임의 추정하지 않고 매매가 상한으로만 사용한다. 완공·승계 등은 후보의 근거가 없으면 충족을 보증하지 않는다. OR 경로는 예산/침실/지역 불일치 후보로 자동 완화하지 않으며, advisor는 후보 중 0건도 선택 가능하다.

### 2026-09-18 이전 후보 상담

- 선택 body `previousAssetIds`: 이전 표시 순서의 고유 공개 ID 0~18개. `selectedAssetIds`: 그 목록의 부분집합. ID는 `[a-zA-Z0-9][a-zA-Z0-9:_-]{0,159}`. 검증 실패는 `INVALID_ASSET_REFERENCES` 400. 클라이언트 자산 내용/가격은 사용하지 않고 공개 repository에서 재조회한다. 과거 결과 진위나 세션 소유권을 증명하는 토큰은 아니다.
- 의도 해석은 `search`와 `review`를 구분한다. review는 수집 callback을 호출하지 않고 이전 후보 순서를 유지한다. 새 예산으로 기존 후보를 비교할 때 가격 필터로 후보를 몰래 교체하지 않는다. 국가/도시 경계 밖과 재조회 불가 대상은 확인 요청으로 처리한다. 누락 ID의 자리를 유지해 순번이 밀리지 않게 한다.
- 응답 `resultSet: {assetIds, returnedCount}`는 이번 표시 목록이며 전체 시장 일치 수가 아니다. `consultation: {mode: search|review|clarify, referencedAssetIds, missingAssetIds}`. review의 `matches`는 이전 표시 목록, `advisor.groundedAssetIds`와 `citations`는 이번 답변에서 다룬 후보라 두 집합 크기가 다를 수 있다.
- OR 상담에 공개 원문명/HTTPS URL, 세부 사실, checks를 전달한다. citations는 서버가 sourceName/url을 붙이며 모델이 새 URL을 발명하면 답변을 거부한다. URL 일치는 본문 모든 사실의 검증을 의미하지 않는다. 실제 계약/비용 장부 필드가 없어 해당 증빙은 null이며 순수익 확정 계산은 지원하지 않는다.
- 현재 후속 입력은 previousAssetIds만 연결했다. selectedAssetIds UI는 Claude 승인 후 연결한다. OR 이외 경로의 review는 규칙 확인 안내를 반환한다. 외부 Map 캐시 소실 뒤 완전 복원, 영속 결과 세션 및 더 오래된 후보 참조는 미완료다.

현재 `GET /api/assets`는 transaction와 direct만 처리하고 최대 100건을 반환한다. country/city/category/page query가 자동으로 지원된다고 가정하지 않는다.

## 베트남 데모 참조 데이터

- P45: source selection을 외부 요청보다 먼저 적용한다. Dot Property만 데모 수집하며 ERA/Batdongsan/Homedy는 disabled와 보류 사유를 반환한다. `projects=[]`는 보조자료 보류이고 시장 부재가 아니다. 수집 자체의 유료 AI 호출은 없다. `/api/search`의 Vietnam 조건은 같은 수집기를 사용하고 결과만 기존 번역/상담 경로에 전달한다.
- P47: `/api/search`의 Philippines 조건은 `discoverPhilippinesAssets`로 Dot 매매/임대 각 첫20건만 수집한다. 동일 LOCAL/명시적 demo 게이트이며 독립 진단 endpoint는 추가하지 않았다. PHP 원가격과 observed USD 참조를 사용하고 기존 번역/상담/원화 응답 계약을 유지한다. 상세는 bounded Map, Lamudi/Rentpad는 보류한다. 같은 원문 URL의 매매/임대는 서로 다른 가격 레코드다.
- `GET /api/discovery/vietnam`: LOCAL development(process env 또는 development binding+loopback) 또는 명시적 demo-auto-approval에서만 200, 그 외 403 `{error:"demo_only"}`. query로 출처 URL/상용 승인을 변경할 수 없다.
- 반환: `{demoOnly:true, checkedAt, cached, projects:VietnamProjectReference[], assets:Asset[], sources:[{name,status,count,reason?}]}`. status는 `collected|blocked|unavailable|mapping_required|disabled`. Dot 실패 시 0건 일치와 구분하며 한 거래유형 실패는 이미 수집한 후보를 유지하고 `partial_collection` 사유를 남긴다.
- Asset의 VND 원문 가격, `sourceObservedAt`, 미확인 `updatedAt=""`, 선택적 `{priceUsdReference:{amount,provider,asOf}}`를 보존한다. 확인된 FX가 없으면 USD 예산 일치에서 제외한다. 기존 `/api/exchange-rates` 응답은 동일하되 날짜가 없는 공급자 응답은 유효 환율로 승격하지 않는다.
- ERA는 프로젝트 참조만 반환한다. `unitPrice/monthlyRent/netMonthlyIncome`은 null, 프로젝트 면적은 `projectAreaText`. 날짜 `publishedAt/sourceUpdatedAt/observedAt`는 서로 다른 의미이며 게시자 주장은 `*Claim`에 저장한다. 직원 검증 상태가 아니다.
- 기존 검색 API의 `matches/resultSet`에 합치지 않는다. 상용 licence, 실제 호실/임대 연결, 영속 저장, 한국어 번역은 별도 미완료다. 공개 출처 GET 외 유료 AI 호출이 없다. API에서 source 문구/JavaScript/작성자 정보는 실행·공개하지 않는다.

## 다른 현재 경계

| 영역 | 읽어야 할 구현 | 주의 |
|---|---|---|
| 환율 | app/api/exchange-rates/route.ts | snapshot/stale, 실패 503. 검색 응답·상담·VND 표시 공유, 규칙 KRW 예산 해석은 아직 고정 demo 값 |
| 로그인/회원 | app/auth.ts, app/api/me/route.ts | ChatGPT 호스팅/데모와 AWS 독립 인증은 별개 |
| 회원 문의 | app/api/inquiries/route.ts | 로그인 POST만. submissionKey/requestText/선택contact·assetId → 서버 회원/자산 확인 → private DB접수 → receiptNumber. 신규201/중복200, 이메일/예약/배정 없음. MY-INQUIRY-WORKFLOW.md |
| 관심 | app/api/favorites/route.ts | 인증 GET/POST/DELETE를 정식/외부/승인 fixture 안정 참조에 LOCAL 연결. 보관 상태/계정 격리. [계약과 미완료](DB-UI-WORKFLOWS.md) |

## LOCAL 가격 이력 / Claude 표시 인계 (2026-10-13)

`GET /api/assets/:id/price-history`: `{assetId, entries, windowVersionLimit:500}`. 아직 보관 참조가 없는 알려진 공개 자산은 빈 entries와 `historyAvailable:false`; 알 수 없는 ID는404. 비공개 정식 자산은 로그인한 기존 관심 소유자만 접근한다. no-store 응답이다.

Entry: `sourceUrl`, `currency`, `transaction`(sale/rent), `price`, 선택 `maxPrice`, `observedAt`, 선택 `sourceUpdatedAt`. 가격은 Asset 원문 통화 값이며 minor 단위 DTO와 혼동하지 않는다. 관측 시각을 원문 게시/갱신일로 표시하지 않는다. 같은 출처의 동일 가격 반복은 생략하며 출처 간 충돌값은 유지한다. private snapshot/설명/사진 변경 이력/병합 근거는 고객 API에서 제외한다.

Claude 작업 경계: 새로운 패널/그래프는 아직 승인/구현하지 않았다. 원문 통화와 매매/월 임대 단위 유지, 출처별 변화 구분, 최근500개 관측 버전 한계 표시 방식을 별도 제안한다. 전체 private 버전 저장과 고객 가격 투영은 별개다. 권한/요금/디자인을 임의로 변경하지 않는다.
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

## 2026-10-01 P48 multi-country consultation extension

`POST /api/search`: optional validated `context.countries` is the authoritative
scope; the legacy `country` remains required for old clients. Returned criteria
preserve multi-country scope. `coverage` and `discovery.countries` contain country,
status (`collected|partial|unavailable`) and collectedCount. First no-geography
question defaults to KH/VN/PH; subsequent no-geography questions retain scope.
See [MULTI-COUNTRY-SEARCH.md](MULTI-COUNTRY-SEARCH.md). No endpoint or auth change.
## P54 비로그인 공개 데모 상담

`POST /api/search`는 DEPLOYMENT_STAGE=demo와 GLI_DEMO_GUEST_AI=enabled가 모두 충족되고 계정이 없으면 실제 상담 모델을 사용할 수 있다. deepSearchEligible에 반영하며 비로그인의 monthlyLimit=0은 회원 월 이용권 미보유를 뜻한다. 운영 한도는 별도: 전체300회/일, 비로그인 공용 풀100회/일. 회원 이용권/실제 ADMIN 검증은 유지한다. flag 미설정/disabled 또는 상용 단계에서는 기존 게이트를 적용한다.

# LOCAL auth preview (2026-10-13)

- POST `/api/auth/preview?provider=google|chatgpt&return_to=/my`: same-origin request, loopback host, development stage and explicit local flag required; otherwise403 with no auth cookie.
- Google assigns a server-generated staff preview UUID; ChatGPT fallback uses a separate developer identity. Real ChatGPT Sites authentication takes precedence. Neither preview grants admin access.
-303 redirects to a safe local path; HttpOnly/SameSite cookie expires in two hours and is removed on logout. This is not Google OAuth or a public social-login contract.
- Browser evidence and limitations: `QA-INTEGRATED-20261013.md`.

