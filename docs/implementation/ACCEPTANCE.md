# 완료 기준과 검증 기록

## 상태 판정

`implemented`: 해당 기능의 좁은 코드 범위 구현. `partial`: 일부 연결/구현. `demo`: 데모·시안·임시 데이터. `planned`: 구현 전. `deferred`: 후속 범위. `decision`은 approved/proposed/needs_decision을 별도로 기록한다.

검증은 코드 존재/단위 시험/로컬 여정/스테이징/실출처·실계정 운영으로 구분한다. 단계 UI, 정적 snapshot, mock 테스트, 문서에 쓰인 VERIFIED는 다음 단계 검증을 대체하지 않는다. 테스트 파일 링크가 있다는 것과 이번에 실행했다는 것은 별개다.

## 회귀 시나리오

| 상황 | 기대 결과 | 연결 |
|---|---|---|
| 시하누크빌 월 $700 이하 가구 포함 2BR 임대 | 도시·유형·가격 엄격 유지, 미확인 가구 조건은 근거 확인 | GS-002/003/010 |
| 프놈펜 5천만원 매수 후 '부대비용 포함 6천만원, 완공만' | 누적 조건 변경, 새 예산·완공 반영, 다른 도시 임의 대체 없음 | GS-010/013 |
| 베트남 매물 요청, 현재 적합 후보 없음 | 베트남 현재 조회 범위의 부재를 설명하고 국가 변경 동의 질문 | GS-005/010 |
| 같은 게시물을 connector와 Gemini가 모두 반환 | 같은 원문은 1건 | GS-007 |
| 사진·주소가 같은 서로 다른 포털 게시물 | 별개 원문으로 모두 표시 | GS-007 |
| 원문 게시일/욕실 정보 없음 | 수집일로 신규 판정하지 않음, 욕실 조사 예정 | GS-008/009 |
| 외부 검색 후 서버 재시작·다른 인스턴스 상세 | 원문 후보가 동일 ID로 조회됨 | GS-004 |
| 상세에서 탐색 결과로 돌아가기 | 이전 결과·조건 유지, 뒤늦은 다른 응답 덮어쓰기 없음 | GS-006/010 |
| 연간 회원권·상위 자산권 | 할인과 포함 단계, 하위 권한 일관 | GS-017/018 |
| 결제 완료 URL 직접 입력·webhook 재전송 | 가짜 권한 생성/이중 적립 없음 | GS-018 |
| 관심 등록 후 직원 조사 | 사용자 데이터 분리, task 배정·증거·보완 연결 | GS-016/019 |
| 뉴스 관리자 예약 게시·수정·회수 | 기존 URL 유지, 초안 비공개, 공개 화면 반영 | GS-023 |
| 동일 예산 환산/카드 가격 범위 | 원통화 유지, 양 끝값 환산, 검색과 표시 환율 일치 | GS-013 |
| 3개 source 실패·모델 timeout | 멈춘 화면과 진행 중을 구분, snapshot을 live로 기록하지 않음 | GS-002/006/012 |

## 기존 시험 활용

registry의 `tests`는 다시 사용할 파일이다. 먼저 관련 좁은 테스트를 실행하고, runtime 변경을 할 때 기존 `npm run check`를 수행한다. 이 명령은 `prebuild`에서 디자인 산출물을 다시 만든다. 원본 보호가 필요한 문서/주석 작업에는 문서 검사와 변경 범위 검사가 적합하며 불필요한 재생성을 피한다.

## 이번 문서화 검증 범위

- registry ID·상태·의존성·evidence path/anchor·테스트 경로의 유효성.
- 모든 실제 app page/API route와 생성 ROUTES 목록 일치.
- OpenAPI의 로컬 ref와 명세 route의 실제 handler 존재.
- 개발자 연결 주석의 GS ID 유효성.
- 원본 HTML·생성 CSS/TS·globals.css 해시 보존.
- 애플리케이션 변경이 주석으로만 구성됐는지 확인.

실제 수집/유료 LLM/결제/AWS/브라우저 UI 시험은 이번 문서 작업에서 실행하지 않는다. 현재 호스팅 환경을 추측해서 registry의 live를 pass로 바꾸지 않는다.

## 2026-09-08 GLI-050 실행 결과

| 검사 | 결과 |
|---|---|
| `npm run spec:refresh` | 기능표·경로표 생성 성공 |
| `npm run spec:check` | 32개 기능, 46개 route, 근거 파일/심볼/의존성/링크/부분 OpenAPI 연결 검사 통과 |
| 검사 도구 mutation probes | 잘못된 의존 ID, 없는 증거 파일, 중복 ID, 잘못된 상태, 순환 의존을 모두 거부 |
| 새 검사 script ESLint | 통과 |
| TypeScript scanner로 HEAD와 변경 파일 토큰 비교 | 애플리케이션 파일 10개: 주석/공백 외 실행 토큰 변경 없음 |
| 디자인 baseline SHA-256 | 원본 HTML·생성 CSS·생성 TS·globals.css 4개 동일 |
| `git diff --check` | 통과 |
| 전체 build/runtime test/live source/배포 | 이번 내부 문서화에서는 실행하지 않음 |

이 결과는 기준 commit `f1bfb7c`에 대한 문서 변경 검증이다. 후속 기능 구현의 성공 증거로 재사용하지 않는다.

## 후속 검증 기록 형식

```text
Feature: GS-xxx
Commit / environment / checkedAt:
Command or user journey:
Input source: fixture | real source | provider sandbox | production
Outcome: passed | failed | not run
Evidence path (no secrets):
Remaining work / next owner:
```

실서비스 전환 판단은 현재 provider, 실제 승인 출처 수집, 독립 사용자 인증, 결제와 잔액, 담당자 운영, 백업 복원, 공개 UI 수용시험을 함께 확인한다. 기존 `/admin/readiness`도 이 범위와 맞추는 GS-032가 필요하다.
