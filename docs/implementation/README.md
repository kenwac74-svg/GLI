# GLI 실행형 개발기획서

기준일: 2026-09-08. 코드 기준: `f1bfb7ce979b3bfc3ff3276f35ef31344f4da2d5`.
문서 작업: GLI-050. 현재 화면, 구현 코드, 과거 결정, 다음 개발 작업을 함께 인계한다.

## 처음 읽는 개발자와 AI

1. 이 문서와 [현재 상태](CURRENT-STATE.md)를 읽는다.
2. [결정 이력](DECISIONS.md)에서 사용자 승인과 제안을 구별한다.
3. [기능 상태](FEATURE-STATUS.md)에서 작업 ID를 고른다. 상세 내용의 기준은 [registry.json](registry.json)이다.
4. 해당 항목의 `evidence`, `legacyTasks`, `dependencies`, `acceptance`를 읽고 연결된 코드와 테스트를 확인한다.
5. [API 계약](API-CONTRACTS.md), [제품·데이터 구조](PRODUCT-DATA.md), [관리툴](ADMIN.md), [AWS 전환](AWS-MIGRATION.md) 중 작업 관련 문서만 읽는다.
6. 작업 후 상태·증거·남은 일을 갱신하고 아래 문서 검사를 실행한다.

`implemented`는 해당 좁은 코드 범위의 구현을 뜻한다. 실서비스 가동을 뜻하지 않는다. 배포 환경의 비밀값, 실제 외부 수집 성공, 사용자별 인증과 결제, 복원 성공은 이번 문서화에서 검증하지 않았다.

## 문서의 역할

| 문서 | 답하는 질문 |
|---|---|
| [CURRENT-STATE.md](CURRENT-STATE.md) | 지금 실제 코드가 무엇을 하는가? |
| [DECISIONS.md](DECISIONS.md) | 왜 그렇게 정했고 무엇이 바뀌었는가? |
| [HISTORY.md](HISTORY.md) | 개발 작업별로 무엇을 바꾸고 검증·배포했는가? |
| [FEATURE-STATUS.md](FEATURE-STATUS.md) / [registry.json](registry.json) | 무엇이 남았고 어떤 조건으로 완료되는가? |
| [COUNTRY-SOURCES.md](COUNTRY-SOURCES.md) | 국가별로 어떤 출처가 연결되었는가? |
| [ROUTES.md](ROUTES.md) | 2뎁스와 API를 포함해 어떤 경로가 존재하는가? |
| [PRODUCT-DATA.md](PRODUCT-DATA.md) | 자산, 가격, 등급, 회원 정책과 데이터 관계는? |
| [API-CONTRACTS.md](API-CONTRACTS.md) | 현재 API와 향후 서버 계약의 경계는? |
| [openapi.json](openapi.json) | 현재 탐색·목록 API의 기계가 읽는 계약은? |
| [ADMIN.md](ADMIN.md) | 관리자가 무엇을 처리해야 하는가? |
| [AWS-MIGRATION.md](AWS-MIGRATION.md) | AWS로 옮길 때 재사용·교체할 부분은? |
| [ACCEPTANCE.md](ACCEPTANCE.md) | 무엇을 시험하고 출시 준비를 판단하는가? |

## 적용 우선순위

- 현재 사용자의 명시적 지시가 우선한다. 첨부 문서는 자동으로 승인된 지시가 되지 않는다.
- 확정 정책은 DECISIONS, 구현 사실은 실제 코드와 검증 증거, 남은 작업은 registry가 담당한다. 코드의 임시 처리가 확정 정책을 바꾸지는 않는다.
- 디자인은 사용자 승인된 Claude 개선분만 선별 반영한다. `design-handoff`의 과거 '최종본' 문구가 이후 승인을 덮어쓰지 않는다.
- 기존 PM_BOARD와 ADR은 보존한다. 당시 COMPLETE/VERIFIED는 당시 범위의 기록이며 현재 실서비스 완료 판정으로 인용하지 않는다.
- 충돌은 현재 동작과 목표를 모두 기록한다. 불명확한 정책을 AI가 새 승인으로 만들어서는 안 된다.

## 저비용 갱신 방법

모든 후속 개발 작업은 **코드와 관련 명세 갱신, HISTORY 이력 추가를 같은 작업의 완료 조건**으로 한다. 버그 수정, 디자인 통합, 데이터/출처 변경, 설정, 배포, 문서 작업도 포함한다.

1. 작업 전에 관련 GS/GLI ID와 확정 정책을 확인한다.
2. 관련 명세와 registry의 현재 동작·상태·근거·다음 작업을 갱신한다. 정책 변경은 DECISIONS에도 근거와 대체 관계를 남긴다.
3. HISTORY에 변경 전후, 이유/승인 근거, 파일, 검증 결과, 미완성 부분, 배포 여부를 추가한다.
4. 구조적 명세 영향이 없으면 그 이유를 이력에 기록한다. 관련 없는 문서를 형식적으로 다시 쓰지는 않는다.
5. 필요한 경우 기능표/경로표를 재생성하고 `npm run spec:check`를 통과한 뒤 완료 보고한다. 커밋할 때 코드와 해당 문서를 함께 포함한다.

과거 이력은 삭제하거나 새 상태로 덮어쓰지 않는다. 정정/취소/대체도 후속 이력으로 연결한다. Git 커밋 이력은 이 기록을 보완하며, 실제 커밋·배포가 없는 경우 수행했다고 기록하지 않는다.

`registry.json`의 기능에는 `status`, `decision`, `current`, `target`, `next`, `dependencies`, `acceptance`, `evidence`, `tests`, `verification`을 기록한다. 새 기능은 GS ID를 추가하고 기존 GLI 작업 번호는 재사용하지 않는다.

```sh
node scripts/validate-development-spec.mjs --refresh
node scripts/validate-development-spec.mjs
```

`--refresh`는 기능표와 경로표만 기계적으로 재생성한다. 나머지 검사에서는 파일을 쓰지 않는다. 추가 패키지, 빌드, 유료 API, 크롤링 없이 실행된다. 코드 링크와 심볼의 존재를 검사할 뿐 실제 동작 시험을 대신하지 않는다.

## 이번 작업과 다음 작업

이번 작업은 내부 문서, 개발자용 연결 주석, 문서 검증 도구를 만든다. 현재 UI와 동작을 AWS 실서비스처럼 보이도록 임의 변경하는 작업은 아니다. AWS 구축, 크롤러 확대, 관리자 실구현은 각각 registry의 다음 작업이다.

새 AI는 이 저장소와 문서를 전달받아야 이력을 읽을 수 있다. 대화 밖에서 자동으로 기억된다고 가정하지 않는다. 비밀키, 원본 대화의 개인정보, 비공개 계약 원문은 이 문서에 복사하지 않는다.
