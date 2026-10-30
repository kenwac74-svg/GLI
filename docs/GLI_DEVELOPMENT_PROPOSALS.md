# GLI Development Team Proposals

These are business/product proposals only. They are not implementation instructions until approved.

## P-001 — Discovery before verification gate
**Problem:** Current UX can suppress useful candidates when evidence is incomplete.

**Proposal:** Return plausible candidates first, then attach evidence/verification state. “Not yet verified” must not equal “do not show.”

## P-002 — In-platform normalization of external listings
**Proposal:** External listings should be shown inside GLI in the user’s language with normalized price, currency, area, location, source, and verification status. Preserve the original link as evidence/reference.

## P-003 — Separate Discovery and Verification pipelines
**Proposal:** Discovery optimizes recall/usefulness. Verification optimizes evidence quality. Verification may downgrade confidence/state but should not silently delete a useful candidate.

## P-004 — Explicit partial-result states
Replace generic “탐색 실패” with distinct outcomes such as:
- search/connector error
- no matching candidate
- candidates found / evidence insufficient
- additional investigation required
- expert/field verification required

## P-005 — Follow-up verification workflow
When information is missing:
- attempt additional automated collection, or
- create/route expert/field task,
then notify/return results to the user.

## P-006 — Generic-AI cost discipline
Do not overbuild capabilities that Gemini/ChatGPT/property connectors can provide cheaply:
- generic natural-language search
- public summaries
- basic ROI calculations
- generic neighborhood descriptions

Invest in:
- evidence state management
- source/country profiles
- expert/partner orchestration
- field evidence
- persistent Verification Record
- transaction execution support

## P-007 — Partner relationship independence
Commercially supplied or marketed assets must not automatically receive higher Trust/Verification status.

## P-008 — Web2 commercial validation before Web3+
Prioritize measurable Web2 paid demand and reusable verification data before committing material development to RWA/fractional-investment infrastructure.

## P-009 — 고객 검색명령 저장과 관리자 품질 검토

기록일: 2026-10-16
상태: **검색명령 저장·품질개선 활용·관리자 열람은 사용자 확정 요구사항. 아래 최소 구성은 개발팀 전달 제안이며, 아직 구현·배포한 기능이 아니다.**

### 확정 요구와 기존 합의 관계

사용자 지시: “대화기록은 크게 필요없으나 고객의 검색명령은 저장후 품질 개선이 되는지 확인하는 자료로 저장하고 관리자도 열람 할 수 있어야 한다.”

- 고객이 실제 실행한 검색명령을 브라우저 임시기록과 별개로 서버에 보관하고, 권한 있는 관리자가 확인할 수 있어야 한다.
- 목적은 실제 고객 질문을 바탕으로 답변·탐색·표현 품질이 개선되는지 살피는 것이다. 전체 상담 대화의 중앙 보관이나 모델 학습 체계를 만드는 과제가 아니다.
- `1681e248de7b728a99531d03bfe780e648d26a39`의 `docs/research/P0-2_RESULT_SCREEN_DECISIONS.md` §1 항목 8과 §3은 검색·답변 기록의 보관 방향은 있으나 저장 항목을 미결정으로 두었다. 이번 지시로 이 과제의 우선 범위를 **검색명령 중심**으로 좁힌다. 기존의 고객 수요 기반 개선 목적은 유지한다.
- 기존 브라우저의 대화·화면 복원 기능을 삭제하라는 뜻이 아니다. 전체 답변 저장과 별도 분석시스템을 이번 요구에 자동 포함하지 않는다.

### 최소 구성 제안

| 기록 | 용도 |
|---|---|
| 검색 요청 식별자·시각·사용자 검색명령 | 실제로 무엇을 물었는지 확인. 저장 재시도는 같은 요청으로 식별하고 고객의 별도 재검색과 구별 |
| 그 검색에 실제 적용한 조건과 필요시 참조 대상 | “그중 더 싼 곳” 같은 후속 검색을 전체 대화 없이 이해. 원 명령과 해석된 조건을 구별하고 없던 조건을 만들지 않음 |
| 처리 결과 상태·응답시간·표시 후보 수 | 오류·자료 부족·지연 사례를 찾아 개선 전후 참고. 단순 설명 질문에는 후보 수를 해당 없음으로 처리 가능 |
| 당시 서비스 버전·응답 모델 식별값(기존에 확보되는 범위) | 어느 상태에서 발생한 검색인지 구별. 이 값들만으로 결과를 완전히 재현할 수 있다고 주장하지 않음 |

관리자 기능은 기존 관리자 화면의 **검색명령 목록·상세·기간/키워드/처리상태 필터**에서 시작한다. 비로그인 검색도 개인 식별정보를 기본 수집하지 않고 포함하는 안을 우선 검토한다. 별도의 대형 대시보드나 AI 자동채점기를 선행 개발하지 않는다.

### 품질 개선에 쓰는 방법

실제 검색명령에서 반복 질문과 잘 처리하지 못한 사례를 선택하여, 개선 전후 답변·결과·표현을 직접 확인한다. 추후 질문별 표현 구성도 실제 수요를 보고 정하며, 모든 질문을 고정 화면에 끼워 맞추는 용도로 사용하지 않는다.

명령만 저장하면 당시 답변의 질을 나중에 복원할 수는 없다. 응답시간·후보 수만 좋아졌다고 고객만족이 개선됐다고 단정하지 않는다. 정성적 전후 비교가 필요한 **선택 표본**은 검토 시점의 결과 또는 화면을 별도로 남기는 안을 검토한다. 이 부분의 저장 범위는 추가 결정이며 전 이용자의 답변·대화 전체 저장으로 확대하지 않는다. 데이터·시점·모델 차이도 비교 시 함께 표시한다.

전체 기록을 자동 재실행하거나 매 검색마다 Astra로 평가하는 방식은 이번 범위가 아니다. 비용을 발생시키는 재검색은 필요한 표본에 한해 명시적으로 실행한다.

### 보관·접근 및 운영 경계

- 입력 중인 텍스트·일반 잡담·전체 대화·로그인 자격증명은 이 기록의 수집 대상이 아니다. 실제 검색 실행 요청을 대상으로 한다.
- 검색명령에 불필요한 전화번호·이메일·민감정보가 섞인 경우의 가림 처리, 보관기간·삭제·이용자 안내는 구현 전 정한다. 실명·연락처·IP를 기본 필드로 추가하지 않는다.
- 관리자 화면뿐 아니라 서버 조회도 권한을 확인한다. 실제 고객 검색기록을 공개 GitHub나 공개 페이지에 올리지 않는다.
- 기록 저장 실패가 검색 답변의 실패로 이어지지 않도록 분리하되, 저장 누락은 운영자가 확인 가능하게 하는 방안을 검토한다. 실패·후보 없음 사례도 품질검토 대상이므로 성공 검색만 남기지 않는다.
- 기존 로그에 질문 본문을 저장하지 않는 원칙이 있다면 무작정 완화하지 않고, 목적·접근권한이 분리된 검색품질 기록으로 설계한다.

### 개발팀 확인 항목

기존 DB·관리자 기능을 재사용할 수 있는 범위와 실제 배포본의 저장 여부부터 확인한다. 구현 시에는 정상/실패 검색 저장, 관리자 권한, 검색명령과 적용 조건의 구분, 중복 저장 방지, 민감정보·삭제 처리, 저장 장애 시 검색 응답 유지 등 변경 범위에 직접 관련된 동작을 확인한다.

이번 커밋은 요구사항 문서 기록만이다. 앱 코드·DB·관리자 UI·검색 로그 수집은 변경하지 않았다.

## P-010 — 기존 OpenRouter로 단일 모델 직접검색 시험

기록일: 2026-10-30
실행 담당: **GLI 데모 개발 채팅**. 현재 GPT 대화는 총괄 사업기획·PM 및 결과 검토 담당이다.
상태: **사용자 제약 반영·Git 인계 기록. 개발 세션의 수신·착수·실제 호출은 아직 확인하지 않았다.**

### 사용자 지시 및 이전 안내 정정

- 사용자는 현재 방식의 적용·테스트를 요청했고, 개발은 `GLI 데모 개발` 채팅이 담당한다고 명시했다.
- 최신 지시: **“API를 따로 또 만들라는 것은 꼭 필요한게 아니면 지양한다. 지금은 오픈라우터를 사용하자.”**
- OpenAI 직접 API 키 발급·별도 결제계정·새 공급자 연결을 요구하지 않는다. GLI의 기존 OpenRouter 인증·결제·호출 기반을 우선 재사용한다.
- 앞서 제공한 `GLI_SOL_직접검색_테스트패키지_20261030.zip`은 OpenAI 직접 API 전제의 참고 테스트다. 그대로 실행할 필요가 없으며, 사용자가 직접 설정·명령어 작업을 할 과제로 넘기지 않는다. 필요한 시험 로직만 개발 담당이 기존 OpenRouter 방식에 맞춰 활용한다. URL만 바꾸고 요청·스트리밍 형식은 그대로 두어도 된다고 가정하지 않는다.

### 최소 실행 범위

1. 개발 세션의 실제 워킹트리·기준 커밋·현재 지시를 확인한다. 기존 검색의 목적별 제약을 전부 복제하지 않는 분리된 로컬 테스트 경로에서 시험한다. 운영 검색/UI/DB와 B안 보관 브랜치는 변경하지 않는다.
2. 기존 OpenRouter 키를 환경 내에서 사용하고 노출하지 않는다. SOL급 빠른 단일 모델을 우선하되, **실제 OpenRouter 모델 ID·접근 가능성·웹검색 지원**을 먼저 확인한다. 사용자 인터페이스 명칭을 API 모델 ID로 추정하지 않는다. 현재 지정 모델이 적합하지 않으면 선택 근거를 기록하고, Astra로의 자동 승격이나 다중 모델 검수를 붙이지 않는다.
3. OpenRouter가 제공하는 웹검색 경로를 사용한다. 공식 문서의 `openrouter:web_search` 서버 도구를 우선 검토하되 베타·계정·모델 지원을 확인한다. 기존 web 플러그인을 활용해야 한다면 그 이유를 기록한다. 두 방식을 중복 활성화하거나 추가 검색 API 키를 요구하는 엔진을 기본으로 선택하지 않는다. 웹검색 사용료는 모델 토큰 비용과 별도일 수 있다.
4. **“베트남 호치민에서 1억 5천만 원으로 임대수입을 기대할 만한 아파트를 찾아줘.”**를 한 번 실제 요청한다. 자료가 없어도 답하지 못하게 하는 내부 매물 게이트, Gemini 선행 수집, Astra 사후 검수, 고정 카드 수·답변 양식 강제는 이 시험에서 제외한다. 사실·광고·추정·미확인은 구분하고 출처를 보존한다.
5. 기본적인 무과금 검사를 먼저 하고, 실제 요청은 초기 1건으로 제한한다. 검색도구 횟수·출력량·요청시간은 지원되는 방식으로 제한하고 실패 시 자동 반복·공급자 자동 우회를 하지 않는다. API 요청 1건 안에서도 복수 웹검색 비용이 생길 수 있음을 구별한다. 기존 개인정보·비용 제한을 우회하지 않는다.
6. 답변 본문·출처·실제 요청/응답 모델·검색 실행 여부·첫 본문 표시시간·완료시간·토큰·확인 가능한 비용을 보고한다. 제공되지 않는 수치는 `미확인`으로 남긴다. URL이 있다는 이유만으로 최신 웹검색 실행이나 매물 검증 성공이라고 판정하지 않는다. 모의 검사와 실제 호출을 분리한다.

### 인계 결과와 승인 경계

개발 담당은 본 항목의 접수/진행 상태, 실제 변경 경로·기준 커밋, 검사 결과, 답변 결과 위치, 남은 문제를 공유 Git 인계 기록으로 회신한다. 고객이 볼 수 있는 답변 결과를 먼저 준비하고 운영 적용·전면 교체·배포는 별도 판단한다. A/B는 이후 동일한 공통 검색 결과로 비교한다. P-009 관리자 검색명령 저장 요구는 유지하지만 이 1회 시험의 선행 구축 조건으로 만들지 않는다.

PM이 문서를 커밋한 것과 개발 채팅에 직접 메시지가 도달한 것은 다르다. 이번 확인에서 Browser 연결은 원래 브라우저 컨텍스트가 없다는 오류로 실패했다. 따라서 개발 세션의 수신 확인 없이 `전달 완료` 또는 `개발 중`이라고 쓰지 않는다.

기술 참고(2026-10-30 공식 문서 조회, 계정에서의 실제 동작 미검증):
- https://openrouter.ai/docs/guides/features/server-tools/web-search
- https://openrouter.ai/docs/guides/features/plugins/overview

이번 변경은 이 문서에 한정한다. 새 API 발급, 키 변경, 앱 코드 변경, 실제 모델 호출, 배포를 실행한 기록이 아니다.
