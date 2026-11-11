# GLI AI Property Platform

GLI is an AI-assisted Southeast Asian property discovery, verification, and consultation platform.

## Latest discussion checkpoint — 2026-11-11

[**최근 논의·저장 상태·Web3 분기·백서 세션 복구 인계**](docs/GLI_DISCUSSION_CHECKPOINT_20261111.md)

기존 검색·UI 합의와 P-012 구현 기준은 유지한다. 최근 Web3 페이지 분리, 사용자가 지정한 백서 전용 세션, 컨텍스트 압축 오류와 미실행 복구안을 보완 기록했다. 전체 대화 원문·첨부자료 또는 접근하지 못한 백서 세션 전체가 Git에 보관됐다는 뜻은 아니다. 별도 Web3 페이지는 백서 전용 세션을 읽기 전에 만든 초안이므로, 원문 복구 후 기존 합의와 대조해야 한다.

## Current development handoff — 2026-11-08

[**P-012: 공통 LLM 답변 + 원래 UI / 개선 UI 전환 개발명세서**](docs/GLI_P012_SHARED_ANSWER_AB_UI_SPEC_20261108.md)

GLI 데모 개발 담당은 위 명세를 기준으로 내부 검토 기능을 구현한다. 기존 OpenRouter의 빠른 단일 모델 답을 추가 LLM 검수 없이 표시하고, 관련 GLI 보유자료가 있으면 최상단에 보여준다. 같은 답변과 대화를 `원래 UI / 개선 UI B`로 전환한다. 전환 때문에 모델을 재호출하지 않는다. 후속 질문 선택과 자유 입력을 모두 지원한다.

운영 UI 교체·공개 배포·제품 채택은 별도 승인 사항이다. B안 원본 위치와 미완료 업로드 상태, 기존 명세와의 관계는 P-012를 따른다. 이 링크는 개발 세션의 수신·착수·완료를 뜻하지 않는다.

## Start here: planning and session coordination

- [GLI PM & session control](docs/GLI_PM_SESSION_CONTROL.md) — 총괄 PM, Claude 공동연구, 개발 실행의 역할과 인계·세션 정리 현황.
- Product decisions remain in the master handoff and decision log below. A research proposal, prototype approval, code commit, merge, deployment, and measured user improvement are separate states.
- Research artifacts may live on a PR branch rather than `main`; use the exact branch/commit recorded in the PM document. Repository state and historical phase labels below are not deployment verification.

## Delivery strategy

1. **Web2 MVP**: normalized property data, conversational search, deterministic Trust Score, human review, consultations, and cash membership.
2. **Web3 extension**: asset-specific GLIB staking, GLID rewards, and verification proofs after the Web2 business model is validated.

## Current phase

Sprint 0: architecture, source-policy validation, development baseline, and delivery controls.

The product source will be integrated from the existing GLI prototype under PM control. See the development specification and project board added on the MVP branch for scope and acceptance criteria.


## Business planning records

- [Master business handoff](docs/GLI_MASTER_BUSINESS_HANDOFF.md)
- [Decision log](docs/GLI_DECISION_LOG.md)
- [SNS & external information strategy](docs/GLI_SNS_DATA_STRATEGY.md)
- [Development team proposals](docs/GLI_DEVELOPMENT_PROPOSALS.md)

These documents are the durable planning handoff between Cloud Chat/Project and local Work/Codex. Confirmed business decisions should be recorded here rather than relying on a single chat session.

- [Claude research handoff](docs/GLI_CLAUDE_RESEARCH_HANDOFF.md) — unresolved research agenda; not a confirmed-policy document.
