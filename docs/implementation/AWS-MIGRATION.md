# AWS 실서비스 전환 준비

GS-025 / P37. 사용자는 GPT 사이트 목업 개선 → Google Cloud 테스트 → AWS 상용 출시 순서를 지정했다. AWS는 최종 상용 목적지이며 각 환경의 실제 리전·규모·서비스 조합·실행 시점은 확정 전이다. 이번에 인프라를 생성하거나 기존 호스팅을 바꾸지 않았다.

## 승인된 단계와 전환 원칙

### D1 우선과 AWS 이식 경계 (2026-10-01 / P49)

현재 저장소는 Cloudflare D1을 우선하고 최종 서비스 목적지는 AWS로 유지한다. D1 바인딩 설정이 있다는 사실과 외부 수집 결과의 영속 저장 완료는 구분한다. 현재 메모리 기반 수집 캐시는 영속 DB를 대체하지 않는다.

- 검색·추천·상담 업무 로직은 저장소 계약을 사용한다. D1 바인딩/SQL과 AWS SDK는 인프라 adapter 안에 제한한다. 기존 `db/assets-repository.ts`, `db/d1-assets-query.ts`, RawObjectStore 경계를 확장하며 같은 역할의 추상화를 중복 생성하지 않는다.
- 수집기는 원문과 정규화 결과를 만들고 저장소를 통해 보존한다. 출처 ID/원문 URL/거래 유형, 수집·확인 시각, 원통화 금액, 원문 버전과 객체 참조를 유지한다. 동일 원문 재수집은 멱등 갱신하고 출처가 다른 게시물은 기존 P04에 따라 유지한다.
- 메모리 캐시는 속도 개선용이다. 매물·상세·수집 작업 상태는 재시작과 인스턴스 변경에도 복구할 수 있어야 한다. 원문 파일은 R2/후속 S3 adapter, 조회 가능한 정규화 데이터는 D1/후속 DB adapter로 분리한다.
- 수집 작업의 입력/결과/실패 상태와 재시도 계약을 분리해 향후 큐 worker로 옮길 수 있게 한다. 지금 SQS나 상시 worker를 새로 구축한다는 뜻은 아니다.
- 스키마 버전과 내보내기/가져오기 계약을 관리한다. 통화·금액 단위·UTC 시각·ID·출처 관계를 유지하고 건수/참조/중복 갱신/백업 복원 시험을 이전 수용 기준으로 삼는다.
- D1(SQLite)에서 PostgreSQL로의 이동은 설정값만 바꾸는 작업이 아니다. SQL·타입·트랜잭션·동시성·migration을 이식하고 동일 repository 계약 시험과 데이터 대조를 통과해야 한다.

다음 구현 단위는 실제 D1 바인딩과 기존 쓰기 경로를 확인한 뒤 외부 수집 결과의 영속 저장을 연결하는 것이다. 전체 백엔드 재작성은 하지 않는다. 이번 결정은 문서 기록이며 DB 전환·제품 변경·배포를 실행하지 않았다. 아래 중간 테스트 단계의 구체 환경은 별도로 확정한다.

| 단계 | 환경과 목적 | 다음 단계 전에 확인할 항목 |
|---|---|---|
| 1 · 현재 | GPT 사이트의 현행 서버리스 목업. 승인 UI를 유지하며 AI 상담·수집·데이터·비용 보호·개발 명세 개선 | QA 문제의 처리/보류 상태, 타입·계약·회귀 시험, 승인 디자인 정합성, 이전 범위와 테스트 수용 기준 |
| 2 · 예정 | Google Cloud 테스트 서버. 실제 영속 저장·인증·운영 연결을 검증 | 실제 상담/수집/후속 대화, 재시작·다중 인스턴스, 권한·비용·실기기·부하·백업 복원 검수 및 사용자 확인 |
| 3 · 예정 | AWS 상용 환경. 검증된 제품을 이전해 출시 | 데이터 이관 정합성, AWS 권한·비밀값·관측·복원·rollback, 공개 배포 승인 |

이는 개발 순서이며 서버리스/상시 서버의 기술 선택을 강제하지 않는다. 2단계 완료 기준의 수치와 테스트 범위는 이전 전에 별도 확정하며, 1단계에서 모든 상용 기능을 먼저 완성해야 한다는 뜻도 아니다.

- 1단계에서 적용 가능한 안정화는 현재 환경에서 수행한다. 비용 보호·대화 길이·중복 요청·타입 검사 같은 QA 항목을 클라우드 이전 뒤로 일괄 미루지 않는다.
- 각 환경에서 화면·업무 정책을 다시 작성하지 않는다. 자산 ID/데이터 의미/API 계약을 유지하고 저장소·인증·실행 환경 adapter를 분리한다.
- Google Cloud 테스트의 구체 구성은 미확정이다. 앞서 제안한 컨테이너/PostgreSQL/객체 저장소는 이식성을 위한 후보이며 현재 구현 완료가 아니다.
- Google Cloud의 검증 결과는 AWS에서 재사용할 회귀 기준이다. AWS 고유 설정과 이관 시험은 다시 수행한다.
- 환경별 설정·비밀키·데이터를 분리하고 기존 사이트를 변경하는 전환은 별도 승인한다. 공개 데모 URL을 임의로 테스트 서버나 AWS로 연결하지 않는다.

아래 AWS 후보 구성과 작업 순서는 이 3단계 계획 안에서 읽는다. Google Cloud 단계를 생략하라는 지시가 아니다.

## 현재와 후보 구조

| 현재 | AWS 후보 | 해야 할 일 |
|---|---|---|
| vinext + Cloudflare Worker | 검증된 Node/React 서버를 ECS Fargate 컨테이너로 실행 | Cloudflare runtime import를 제거/격리하고 실행 호환성 검증 |
| D1 + Drizzle SQLite | RDS PostgreSQL | schema 타입, SQL, transaction, ID, migration, connection pool 이식 |
| R2 | S3 | EvidenceStore 인터페이스, object key/권한/업로드 정책 |
| public request 안의 collector | SQS + 별도 worker | job 상태, retries, idempotency, 부분 결과 |
| scheduled worker entrypoint | EventBridge Scheduler + worker | 일정/중복 실행/실패 처리 |
| 호스팅 인증 + demo cookie | Cognito 등 독립 인증 | member ID 연계, 역할, 세션, 관리 권한 |
| 호스팅 env secrets | Secrets Manager + IAM | 기존 키 값은 코드에 옮기지 않고 서버 참조만 연결 |
| Sites 공개 URL | CloudFront/ALB/도메인/TLS | cache, origin, HTTPS, 배포 rollback |
| 기존 운영 health 코드 | CloudWatch 등 | 지표/오류/작업 로그와 비용 관측 |

이 조합은 확정된 구매 목록이 아니다. 실제 부하와 crawler 실행 시간으로 최소 구성을 정한다. 초기부터 Kubernetes, 모든 국가 collector, 복잡한 모델 라우팅을 추가할 필요는 없다.

관련 공식 자료: [Fargate 실행](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/getting-started-fargate.html), [SQS/EventBridge 역할](https://docs.aws.amazon.com/decision-guides/latest/decision-guides/sns-or-sqs-or-eventbridge.html), [Secrets Manager](https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html). 서비스 선택 시 지원 리전과 현재 사양을 다시 확인한다.

## 재사용과 교체

- 보존: 사용자 승인 UI, 카드/상담 출력 계약, 국가·가격·권한 정책, source별 parser, 테스트 입력 사례, 기존 GLI/DEC 번호.
- 교체: `cloudflare:workers` import, D1 `prepare/bind/batch` 계약, R2 binding, 인증 provider, 호스팅 build/배포 구성.
- 연결: public discovery → 영구 원문 저장 → 검수/공개 → 사용자 관심 → 직원 조사.
- 추가: production 결제·Cash 원장, CMS, 전체 검색비용 한도, 실제 복원/운영 검증.

기존 `RawObjectStore`와 asset repository 경계는 출발점이다. 현재 public Map 저장을 PostgreSQL로 옮기는 것만으로 전체 workflow가 자동 완성되지는 않는다.

## 순서와 완료 증거

1. GS-004/008/010의 데이터·요청 계약을 구체화하고 동일 fixture 계약 시험을 만든다.
2. AWS 개발환경을 IaC로 생성한다. 계정·리전·예산과 배포 역할은 사용자가 결정한다.
3. PostgreSQL/S3 adapter를 구현하고 빈 DB migration과 D1 export 변환을 시험한다.
4. 한 캄보디아 출처를 큐 기반 수집에 연결해 저장/상세/재확인을 검증한다.
5. 인증·관심·상담·관리툴을 통합하고 승인 디자인과 비교한다.
6. 결제 sandbox/Cash/뉴스 CMS와 운영 관측을 연결한다.
7. 스테이징에서 수용시험·복원·rollback을 통과하고 공개 배포 승인 후 전환한다.

각 단계에서 commit, 환경, 실행 명령, 성공/실패, 데이터 수량, 남은 일을 기록한다. 모든 `planned`를 이번 문서 작업으로 완료 처리하지 않는다.

## 데이터 이전 시 확인

정수 minor money, 날짜 단위와 timezone, nullable 필드, SQLite boolean/text JSON, 자동 ID와 FK, unique source key, transaction 원자성, 결제/사용량 동시성, object hash/문서 접근 권한을 비교한다. 데모 데이터를 실제 계정과 섞지 않는다. 전환 전후 동일 자산 ID와 뉴스 URL을 유지하며 실패 시 이전 서비스로 복귀할 수 있어야 한다.

## 이식 개발자에게 넘길 산출물

이 폴더, registry와 ROUTES, 현재 코드/테스트, 승인 시안 경로, DB migration, key가 아닌 env 이름, 배포/복원 runbook을 넘긴다. 실제 운영 credential은 별도 보안 채널로 제공한다. 공개 화면에 개발 내부 설명을 추가할 필요는 없다.
