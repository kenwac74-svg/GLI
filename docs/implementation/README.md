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

2026-09-23 1단계 개선: [AI 운영 보호 계약](AI-OPERATING-GUARD.md), P38, HIST-20260923-014를 함께 읽는다. 공통 300/100 일일 요청 한도와 공급사 원장, 취소/중복/긴 답변 처리, 타입 검사 게이트가 로컬 구현됐다. 금액 상한·외부 후보 영속화·최종 Claude 시안 통합·공개 배포가 완료됐다는 뜻은 아니다.

기술 검수: [2026-09-23 웹 QA: 서버 구조·토큰 비용·개발 인계](WEB-QA-ARCHITECTURE-20260923.md). 격리 사본 빌드/테스트 결과, 비용 보호 및 타입 검사 미비, 최신 디자인/API 연결 경계와 기획서 재구성 가능 범위를 구분한다. 수정·배포 승인이 아니다.

외부 콘텐츠 인계: [2026-09-21 GLI 봇 지식베이스 전달본](../knowledge-base/2026-09-21/README.md). Trust 8등급, 멤버십, FAQ 원문과 구축 담당자용 확인 사항을 분리한 스냅샷이며 정책 변경이나 공개 배포가 아니다.

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

2026-09-18 P34: 외부 자산 한국어 번역은 GS-033 및 [제품·데이터 구조](PRODUCT-DATA.md)의 번역 계약을 따른다. 원문을 유지한 표시용 번역이며 Claude 디자인 변경/공개 배포는 하지 않는다. 검증은 HIST-20260918-006을 참조한다.

2026-09-18 P32 후속: Astra 주 상담과 의도 선해석→실제 검색 연결을 로컬 적용했다. [1차 구현 및 남은 범위](GLI-052-CONVERSATIONAL-ARCHITECTURE.md)를 읽고 HIST-20260918-004를 확인한다. 합성 3턴과 브라우저 실제 출처 검색을 검증했으며 디자인 변경/공개 배포는 하지 않았다.

2026-09-18 P33 후속: [Claude 상담 UX 핸드오프 B1~B5](../../design-handoff/GLI-052-CONSULTATION-UX-BRIEF.md)에 BuildBlock 실사용 관찰과 분업/승인/수용시험을 정리했다. 이전 후보 재조회·review 분기·출처 근거 계약은 [API-CONTRACTS.md](API-CONTRACTS.md), 검증/한계는 HIST-20260918-005를 따른다. 정적 카드/상세 C1 정합성, Claude UI 통합, 영속 기억, 공개 배포는 여전히 미완료다.

2026-09-18 후속: [GLI-052 AI 상담 작업지시서](GLI-052-AI-CONSULTATION-WORK-ORDER.md). A1/A4 및 P30 체험 방향, P31 OpenRouter 품질 비교가 승인됐다. [Fable/Astra 연결·실호출 비교](OPENROUTER-COMPARISON.md)는 로컬 완료했으며 Gemini는 별도 API를 유지한다. A2·A3 고정 정책은 [상담 아키텍처 검토](GLI-052-CONVERSATIONAL-ARCHITECTURE.md) 후 결정한다. 상태/도구 루프, 공개 체험 할당량, Claude 시각안 통합·공개 배포는 미완료다.

이번 작업은 내부 문서, 개발자용 연결 주석, 문서 검증 도구를 만든다. 현재 UI와 동작을 AWS 실서비스처럼 보이도록 임의 변경하는 작업은 아니다. AWS 구축, 크롤러 확대, 관리자 실구현은 각각 registry의 다음 작업이다.

새 AI는 이 저장소와 문서를 전달받아야 이력을 읽을 수 있다. 대화 밖에서 자동으로 기억된다고 가정하지 않는다. 비밀키, 원본 대화의 개인정보, 비공개 계약 원문은 이 문서에 복사하지 않는다.
