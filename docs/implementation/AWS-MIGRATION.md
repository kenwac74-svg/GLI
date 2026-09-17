# AWS 실서비스 전환 준비

GS-025. AWS는 이식 목표로 검토 중이며 실제 리전·규모·서비스 조합·실행 시점은 확정 전이다. 이번에 인프라를 생성하거나 기존 호스팅을 바꾸지 않았다.

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
