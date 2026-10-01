# 국가별 데이터와 출처

국가 카드, 파트너 자산, 지원 통화, 도시 이름 파서가 있다고 크롤러가 연결된 것은 아니다. 아래는 현재 코드 상태이며 외부 시험은 날짜별 절에 구분한다.

| 국가 | 보유 데이터/코드 | 외부 자동 수집 | 다음 일 |
|---|---|---|---|
| 캄보디아 | 샘플, source snapshot, live connector, Gemini scout | 조건부 연결; 실제 성공률/운영 설정 미검증 | GS-002~004: 범위·저장·동기화 |
| 베트남 | 파트너 문서 + Dot Property 매매/임대 데모 수집 | P45로 LOCAL/명시적 demo 검색·상세 연결; 보조자료는 보류 | GS-005: 영속 저장/조회 범위/상용 허가; Homedy 매핑·Batdongsan 접근은 미완료 |
| 필리핀 | RLC/Mantawi 파트너 자료 + Dot Property 매매/임대 데모 | P47 LOCAL/명시적 demo 검색·Map 상세 연결 | GS-005/029: 재고 범위/영속 저장/상용 허가; Lamudi·Rentpad 보류 |
| 말레이시아 | Armani Hallson, Golden Crown, Pavilion, CloutHaus, TS2 관련 파트너 자료 | 미연결 | GS-005/029: 문서/사진/출처 채널 연결 |
| 태국·인도네시아·싱가포르·중국·기타 | 디자인 예시/통화 지원과 실제 자산 데이터 범위는 별개 | 연결된 국가별 collector를 확인하지 못함 | 필요 국가부터 승인된 source를 등록; 구현했다고 표시하지 않음 |

## 캄보디아 연결 구조

| 출처 | 코드의 접근 방식 | 제한/미확인 | 실개발 연결점 |
|---|---|---|---|
| CAM Realty | WordPress `wp/v2/property`, 도시 search; Gemini direct URL allowlist | 페이지당 30, 기본 수용 20; 누락 필드 탈락 가능; 오늘 응답 미확인 | `ingestion/wordpress-property-feed.ts`, `lib/cambodia-live-discovery.ts` |
| Cambodia Property Asia | WordPress property API, `/en/` 원문 경로 제한; Gemini allowlist | 동일한 보편 parser 사용이 출처 고유 구조를 다 반영하는지 미검증 | 같은 connector를 source별 mapping으로 보완 |
| Khmer24 | reference HTML connector, 기본 rentals 경로, 도시 q; Gemini allowlist | 매매 검색면·도시별 결과·페이지 확장 미완; source refusal 가능 | `ingestion/khmer24-reference-feed.ts` |

전문 출처 2개 후 Khmer24라는 순서는 일부 구현됐다. 충분한 초기 결과가 있으면 사용자 '더 탐색' 동작 이후 광범위 수집한다는 최종 흐름은 GS-006이다.

다른 조사 사이트(IPS, Realestate.com.kh, FazWaz)가 [기존 출처 등록부](../source-policy-register.md)에 있어도 현재 합의한 3개 자동 수집 출처에 추가된 것은 아니다. 소셜/커뮤니티는 직원 수동 조사 영역이다.

## 필리핀 데모 매물 연결 / P47 / 2026-10-01

- 사용자 '우선 되는 것만 연결' 승인으로 Dot Property Philippines만 활성화했다. Lamudi/Rentpad는 조사 도구 HTTP403으로 검수 보류하며 매 검색마다 요청하지 않는다. 403의 원인을 봇 차단으로 확정하지 않는다. 나머지 포털·개발사·은행·리서치는 미연결이다.
- `lib/philippines-discovery.ts`는 기존 LOCAL/명시적 demo 게이트, robots 해석, parse5 카드 parser, 환율 서비스를 재사용한다. 매매/임대 첫 페이지 각20개, 성공10분/실패1분 캐시와 in-flight 공유, 상세 Map 최대120개. PH 응답만 최대3MB/12초(실제 페이지 약2MB), robots64KB. redirect/403/429/robots 거부 시 중단하며 차단 우회/로그인/페이지 순회/상세·연락처 수집은 없다.
- PHP 원가격·표시 거래유형·도시/지역·면적·침실/욕실·첫 이미지·원문 URL/수집시각만 채택한다. 원문 게시일은 미확인으로 남기고 Trust 0/PRELIMINARY 유지. 'Sale or Rent' 원문 URL은 두 목록 가격이 다르므로 URL+거래유형으로 식별/중복 제거한다. 광고의 수입/완공/외국인 소유/세금 주장을 검증 사실로 승격하지 않는다.
- `/api/search`의 Philippines 분기와 `getAsset` Map 조회에 연결했다. 필터 후 기존 유료 검색의 번역/상담 경로만 재사용한다. 수집 자체는 AI 호출0회. PHP 환산은 공유 API snapshot이며23시간 캐시의 최신성 한계(P46)는 그대로다. 알려진 독립 필리핀 지명만 한국어 표시하고 브랜드명은 기존 P40 보호 규칙을 적용한다.
- 실제 일반 서버 GET robots/매매/임대 HTTP200, 매매20+임대20 수용, 동일 실행의 상세 lookup·캐시 확인. 임대 예시 PHP23,000→약496,924원/월. 이 값은 시험 당시 snapshot에 따른 호가 환산이며 실제 임대 계약/순수입/전체 시장 재고가 아니다. 새 유료 번역/상담 및 브라우저 전체 여정은 미검증이다.
- [Dot/Lifull 약관](https://www.lifullconnect.com/legal-notice-direct/)의 콘텐츠 추출/복제 제한을 확인했다. 사용자 데모 승인과 출처의 재사용 라이선스는 별개이며 상용 활성화에는 허용 피드/협의·승인이 필요하다. D1/R2 영속 수집/다른 인스턴스 상세 복구·전 도시 재고/정기 크롤링은 미완료. 키/설정/디자인/공개 배포는 변경하지 않았다.

## 베트남 데모 매물 연결 / P45 / 2026-09-30 (현재)

- 사용자 데모 재사용 승인 후 Dot Property의 공개 매매·임대 카드 필드를 실제 응답과 대조했다. robots는 GLI collector 식별자와 wildcard/Allow 우선순위를 확인한다. 일반 GET만 사용하며 redirect/차단 우회·contact form 호출·페이지 순회 없음.
- `lib/vietnam-discovery.ts`는 거래유형별 첫 페이지 최대 20건(총 40)을 수집한다. 가격 VND(단위 million/billion), 원문 URL, 위치, 침실/욕실, 호실 면적, 첫 매물 사진만 읽는다. 불완전/미지원 통화·위치·연락처 포함 title은 제외한다. 전체 원문/agent 정보·private 연락처는 보관하지 않는다.
- 같은 원문 URL 반복만 제거하며 다른 게시물은 그대로 유지한다(P04). 원문 날짜는 카드에 없어 `updatedAt=""`, `sourceObservedAt`만 기록하며 날짜를 조작하지 않는다. 상세는 명시적 사실 필드로 표시한다. Trust 내부 0/PRELIMINARY는 초기 미검증값으로서 외부 seller 인증을 승계하지 않는다.
- `/api/search`의 Vietnam 분기에 연결했고 `getAsset`은 bounded Map lookup을 공유한다. 성공 10분/실패 1분 캐시, 실행 중 공유, 상세 레코드 최대 120개다. 서버 재시작/다른 인스턴스 상세와 D1/R2 영속 저장은 미완료다.
- 기존 ExchangeRate-API fetch/cache를 `lib/exchange-rates.ts`로 공유한다. 원문 VND 유지, 확인된 환율로 `priceUsdReference`만 추가하며 환율 미확인/실패 시 예산 필터에서 제외한다. 예산 없는 검색에는 남는다. KRW 질문의 기존 데모 환산 기준은 이 작업에서 변경하지 않는다.
- 실제 수집 시험: 매매 20 + 임대 20(HTTP200). 전체 베트남/하노이/다낭/저가 재고의 충분한 커버리지를 의미하지 않는다. 임대 호가를 매매 호실 실제 임대계약/순수입으로 붙이지 않는다.
- Homedy 기술 매핑 timeout, Batdongsan HTTP403, ERA/IQI/미디어/지도 보류. Dot의 데모 운영 승인은 출처 라이선스/상용 협의/학습 수집 승인과 다르다. 상용 게이트 유지, 별도 공개 배포 없음.

## 베트남 이전 선택 정책 / P44 / 2026-09-30 (Dot 데모 보류는 P45로 대체)

- 사용자는 1차 검수 통과 출처만 추가하고 보조자료는 처리량 절감을 위해 고도화 때 활용하도록 결정했다. 이전 보고의 '1차 검수'는 우선 조사 후보 분류였으며 완료 판정이 아니었다.
- ERA 프로젝트 조회는 `auxiliary_deferred_P44`로 중단, IQI·미디어·지도 등 보조자료는 신규 연결하지 않는다. ERA parser는 향후 고도화용으로 보존하되 현재 자동 호출하지 않는다.
- Batdongsan은 기존 HTTP403 증거에 따라 보류하며 조회마다 robots/list를 다시 요청하지 않는다. P43의 상용 협의 요구는 그대로 유지한다.
- Dot Property와 Homedy robots/homepage는 GLI User-Agent의 일반 서버 GET에서 HTTP200. 공개 매물의 가격·면적 존재까지 확인했지만 재사용 조건/필드 매핑 검수는 미완료다. 이를 통과나 GLI 검증으로 승격하지 않는다.
- Dot Property [운영 약관](https://www.dotproperty.com.vn/en/operations-policy)의 제3자 제공/복제 제한은 허용 피드나 협의로 명확히 해야 한다. Homedy [운영 규정](https://homedy.com/quy-che-hoat-dong)은 저작권을 유보하며 재사용 허가는 확인되지 않았다. Homedy robots의 GPTBot 제한도 관측했다. 본 작업은 학습 수집이나 차단 우회를 허용하지 않는다. 이는 법적 위법 확정 판정이 아니라 보수적인 활성화 보류다.
- 현재 `GET /api/discovery/vietnam`은 네 후보의 disabled 사유와 빈 projects를 반환한다. 외부 요청/유료 AI 호출 0회이며 기존 캄보디아·정적 파트너 데이터·화면은 그대로다. 1차 검수의 나머지 항목은 허용 필드·갱신일/원문 ID·매매/임대·통화/단위 매핑 및 소규모 정상 수집이다.

## 베트남 데모 최초 연결 / P43 / 2026-09-30 (과거, P44로 수집 보류)

- P43: 사용자가 ERA `https://era.com.vn/du-an/`를 지정하고 Batdongsan은 데모 연결, 상용은 협의 후 연결하도록 결정했다. 이는 GLI 데모 운영 승인이지 출처의 상업적 재사용 허가가 아니다.
- `GET /api/discovery/vietnam`의 환경 게이트는 LOCAL(development) 또는 기존 명시적 demo+auto-approval이다. Cloudflare development binding은 loopback 요청에서만 로컬로 인정한다. 상용/운영 환경은 403 `demo_only`. P44의 출처별 보류는 환경 게이트와 별개이며 키·호스팅 설정은 변경하지 않았다.
- ERA 공개 robots와 목록은 실제 HTTP 200, 공개 `initialProjects`에 12개 프로젝트 확인. JSON payload만 읽고 소스 JavaScript는 실행하지 않는다. 이름·위치·태그·개발사/소유권/진행 주장·프로젝트 전체 면적·원문 날짜를 선택적으로 추출하며 작성자 이름/이메일은 가져오지 않는다.
- 개별 호실 가격·월세·순수입은 현재 이 매핑에 없으므로 null. 프로젝트 전체 면적을 호실 면적으로 환산하지 않는다. ERA 자료는 가격 필터/임대 추천/완공 검증 근거가 아니며 기존 `/api/search`, 자산 카드·상세·AI 상담에는 아직 연결하지 않았다.
- Batdongsan robots와 목록 요청 모두 서버에서 403 challenge 확인. collector는 robots 403에서 중단하고 `blocked`를 반환한다. 재시도·proxy·CAPTCHA·브라우저 세션 이전 등의 우회는 없다. 정상 응답을 받더라도 필드 검증 전에는 `mapping_required`, 수집 완료로 세지 않는다.
- demo 조회는 최대 20 프로젝트, 응답 2MB, 12초 제한. 실행 중 요청 공유와 성공 10분/전부 실패 1분 캐시로 중복 조회를 줄인다. 현재 메모리 캐시이며 D1/R2 영속 저장·전체 페이지 순회·주기 수집·한국어 번역은 미구현이다. 추가 유료 AI 호출은 없다.
- 시험: `tests/vietnam-discovery.test.mjs`. Batdongsan은 허용된 feed/allowlisting/원문 내보내기 자료가 필요하며 상용 자동 수집은 서면 협의 후 별도 승인·구현한다.

## 출처 등록 시 남길 항목

`country`, `slug`, `displayName`, `baseUrl`, `allowedHosts`, `connectorKind`, 지원 도시/거래유형/자산분류, 필드 매핑, 원문 ID 규칙, 검색/상세 endpoint, 날짜 필드 의미, 제한/페이지 수, 이미지 사용 범위, 운영 승인 상태, 마지막 성공/실패와 증거 위치를 저장한다. 키 값이 아닌 secret 참조 이름만 기록한다.

## 새 국가 완료 조건

1. 국가/도시/통화/매매·임대 유형과 출처별 필드 대응을 정의한다.
2. 미제공 필드는 null+상태, 원문 날짜는 별도 보존한다.
3. 서로 다른 게시물은 유지하고 동일 원문 ID만 갱신한다.
4. 최초 검색 결과 저장 → 다른 인스턴스에서 상세 → 재검색 원문 확인을 시험한다.
5. 연결 실패와 현재 조건 일치 0건을 구별하고 다른 국가를 임의 추천하지 않는다.
6. 실행 환경·시각·source run ID·수용/탈락 사유를 내부 증거로 기록한다.

파트너의 PDF/PPT/HWP는 외부 포털 crawler가 아니다. 향후 파일 업로드 후 프로젝트/호실/분양가 범위와 근거를 정리하는 별도 관리 흐름으로 이관한다.
