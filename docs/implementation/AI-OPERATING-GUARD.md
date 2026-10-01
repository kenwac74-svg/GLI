# AI 운영 보호 계약

2026-09-23 / P38 / GS-010·011·012·032·033. 현재 GPT 사이트 개선 단계의 **로컬 구현**이며 공개 배포 완료가 아니다.

## 호출 경계

`POST /api/search`가 `createAiOperation` 하나를 만들고 intent/discovery/translation/advisor에 `forStage()` fetch를 전달한다. 최초 실제 호출 직전에 D1 `ai_operation_requests`를 한 번 예약하고 이후 단계는 같은 예약을 쓴다. 동시 단계도 같은 Promise를 공유한다. 단일 SQL의 전역/계정 조건부 INSERT로 다중 서버 한도를 집행한다. 별도 관리자 평가/CLI 비교는 이 공개 탐색 경로가 아니며 자동 실행하지 않는다.

- 한국 날짜 기준 전체 300회/일, 로그인 계정 100회/일. 비로그인은 안정적인 신원 구현 전까지 공통 풀 100회/일.
- 캐시만 읽거나 실제 모델 호출이 전혀 없으면 예약하지 않는다. 예약 이후 실패·취소·규칙 대체·프로세스 중단은 예약을 반환하지 않는다.
- 요청당 유료 공급사 호출 hard cap 9회. 현행 의도 1 + 탐색 1 + 기존/새 후보 번역 각 최대 3배치 + 상담 1을 넘기지 않는다. 자동 재시도/모델 fallback/자율 도구 루프는 없다.
- 고객의 월별 상담 카운터와 운영 원장은 독립이다. 최종 상담 실패/취소로 고객 횟수를 복구해도 비용이 환불됐다는 의미가 아니다.
- D1/원장 기록 실패 시 fail-closed: 새 유료 호출 차단, 원문·캐시·규칙 fallback 유지. 운영 한도는 금액 상한을 보장하지 않는다.

## 원장

`drizzle/0017_ai_operating_usage.sql`, `db/schema.ts`: 요청 ID/한국 날짜/계정 식별자 해시/시각과 공급사 호출 ID/단계/모델/HTTP 상태/반환 usage를 저장한다. 대화/매물 본문/키/IP는 저장하지 않는다.

- `started`: 전송 전 기록됐고 최종 결과를 받지 못했을 수도 있음.
- `received`: HTTP 성공 응답을 받았음. 상담 스키마/근거 검증 통과를 뜻하지 않음.
- `http_error`, `error`, `aborted`: 실패 종류만 기록. 공급사 오류 본문은 기록하지 않음.
- input/output/total tokens와 cost는 공급사가 반환한 유한 비음수만 기록하고 없는 것은 null. Gemini candidatesTokenCount는 텍스트 출력 토큰, totalTokenCount는 공급사 합계이므로 두 수치의 단순 합과 같다고 가정하지 않는다.
- 원장 업데이트 실패 시 해당 호출은 started로 남을 수 있으며 이후 유료 단계를 막는다. 금액 null은 무료/0달러가 아니다. 서버 장애로 예약 후 실제 전송하지 못했더라도 보수적으로 운영 횟수는 유지한다.

## 재사용과 취소

- Gemini discovery: 계정 scope+질문 공백 정규화+검증 조건+모델/설정 hash로 완료 10분 캐시, 같은 프로세스의 진행 중 Promise 공유, 실패 60초 cooldown. 문장을 의미 요약하지 않는다. 캐시 256개, 진행 요청 32개까지다.
- 공유 요청의 최초 실행자가 취소되면 해당 공유 호출도 중단될 수 있다. 다른 대기자의 취소는 기다림만 종료한다. 새 자동 유료 재시도는 하지 않는다. 서버 간 분산 single-flight/요청 idempotency는 다음 작업이다.
- 번역은 기존 공개 원문 hash/R2 캐시를 유지한다. 목록/상세에서는 새 유료 생성 없이 캐시를 읽는다. 검색에서만 보호된 fetch를 넣는다. API 실패/캐시 miss에서는 원문 유지.
- 클라이언트 중복 클릭은 동기 ref로 막는다. unmount/pagehide/메뉴 이동/브라우저 history 전환은 fetch를 취소하고 서버는 통지된 signal을 각 유료 호출과 다음 단계에 적용한다. 이미 지불된 공급사 비용은 취소로 취소되지 않는다. 기존 비유료 crawler 진행 중 I/O 전체 중단은 별도 과제다.

## 실행과 검증

먼저 DB migration 0017을 대상 환경에 적용해야 한다. 미적용 환경은 유료 AI가 fail-closed 된다. 공개 DB migration/배포는 별도 승인이다. 로컬은 `npm run db:local`의 기존 DB 위치와 실제 dev server 위치가 같은지 확인한다. 원장 초기화/삭제로 한도를 우회하지 않는다.

이번 기존 로컬 D1은 과거 기반 테이블은 있으나 migration 이력이 비어 있었다. 해당 DB를 백업한 뒤 0017의 두 신규 테이블/인덱스만 적용하고 그 파일만 이력에 기록했다. 기존 migration 전체를 재적용하거나 과거 적용 완료를 임의로 기록하지 않았다. 과거 로컬 DB의 회원/운영 테이블 정합성 정리는 별도 작업이다. 전체 migration 0000~0017의 정상 fresh DB 적용은 격리 SQLite 시험에서 검증했다.

`npm run check`는 lint → typecheck → 전체 migration 검증 → vinext build → tests를 실행한다. `worker-runtime.d.ts`는 설치된 Wrangler/workerd에서 생성한 서버 타입 스냅샷이며 DOM과 충돌하지 않게 module 경계/명시 export를 둔다. 환경 binding은 `cloudflare-bindings.d.ts`에 명시한다. 생성 타입을 개발 대화에 통째로 읽거나 클라이언트에 전송하지 않는다.

Vite dev watcher는 `.runtime-*`, `work`, `.wrangler`를 제외한다. 특히 프로젝트 내부 QA 사본의 빌드 결과를 감시하면 Windows EBUSY로 로컬 앱까지 종료될 수 있으므로 이 제외 규칙을 유지한다. 타입 검사도 work/dist 등 산출물 사본을 검사하지 않는다.

기본 검증은 mock fetch/메모리 SQLite이고 비용을 발생시키지 않는다. 실제 공급사 비용 절감률·공개 동작·장애 복구를 측정한 것은 아니다. migration→로컬 원장 기록→공개 배포 승인→배포 후 저비용 smoke 순서로 진행한다.

## 다음 단계

외부 후보 영속 repository/재시작·다중 인스턴스 검증(GS-004), 운영 원장 보존·정리/관리자 조회/경보, 금액 상한·사용자별 단기 rate limit, 독립 guest 인증, 서버 간 single-flight, GCP 이식. 최신 Claude UI adapter/미승인 문구/모바일 시안은 별도 승인 경계다. Fable 제외(P36)와 GPT→GCP→AWS(P37)는 그대로다.
