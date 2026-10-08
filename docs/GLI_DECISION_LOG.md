# GLI Decision Log

## 2026-08-13 — Web2 business/product baseline
- GLI defined as a human-AI verification orchestration platform, not merely RAG property search.
- Residential, commercial, leisure, and project-investment assets supported.
- Online verification is not final verification.
- Trust Score, Asset Quality, and Buyer Fit separated.
- LLM cannot directly write Trust Score or verification state.
- Account membership and asset information/value tiers separated.
- Web2 prioritized; Web3 retained as later extension.

## 2026-10-05 to 2026-10-06 — UX reset
- User experience must not behave like a correct-answer exam.
- Candidate discovery should not be suppressed solely because full verification is missing.
- Canonical UX: **먼저 찾아준다 → 얼마나 믿을 수 있는지 보여준다 → 부족하면 GLI가 더 알아본다.**
- Discovery and Verification must be treated as different stages/functions.
- External foreign-language source content should be translated/normalized and shown inside GLI; original links remain evidence, not the primary UX.
- Missing internal data is not a reason to stop. GLI should perform additional automated research or route to expert/field verification and later return the result.

## 2026-10-06 — Strategic interpretation
- Generic AI/property-search capability is not considered a durable moat.
- GLI should focus investment on verification orchestration, local execution network, persistent verification records, transaction accessibility, and later RWA/fractional access.
- Web2 and Web3+ solve different layers of need:
  - Web2: information, trust, transaction accessibility
  - Web3+: capital accessibility
- Web2 must be commercially viable without relying on future Web3 revenue.
- Biggest business risk identified: excessive pre-revenue capital burn from an overbuilt global platform.

## Unresolved / requires separate decision
- Exact country rollout sequence beyond initial Southeast Asia focus.
- Exact SNS/source list and crawl cadence.
- Exact Trust Score weights and thresholds.
- Exact Premium/Business prices and SLA.
- Exact 2027+ RWA/fractional structure subject to legal/regulatory review.

## 2026-10-06 — Highest-level product principle established
- **Top-level rule:** if GLI gives a slower, less detailed, or less practically useful answer than a leading general-purpose LLM, the product has failed at the first user-value layer.
- GLI must treat the capabilities of leading general-purpose LLMs as the minimum baseline, not as differentiation.
- Verification, data-quality, safety, or internal DB rules may not suppress useful discovery to the point that GLI becomes less useful than general-purpose AI.
- GLI differentiation must begin after baseline discovery/advice: normalization, evidence-state management, additional investigation, expert/field execution, persistent Verification Record, transaction support, and future compliant RWA/fractional access.
- Any lower-level architecture or requirement that conflicts with this principle must be re-evaluated.

## 2026-10-08 — GPT–Claude 공동 협업 및 3회 반복 중단 규칙

상태: **사용자 확정.** 원문 취지: 하나의 컨텍스트에 지배되어 다른 발상을 못하는 상황을 피하기 위해 Claude와 공동 협업한다. 동일 문제에 코드 변경 수준의 답을 3회 이상 반복하면 GitHub에 커밋하여 Claude 의견을 듣는다.

- 발동 기준: 같은 미해결 사용자 문제에 국소 코드 수정 수준의 답변·제안을 3회 반복하면 컨텍스트 매몰을 의심하는 운영상 경고로 취급한다. 실제 수정·배포를 하지 않은 제안도 포함한다. 표현·파일명·세션이 바뀌었다고 같은 문제의 횟수를 초기화하지 않는다.
- 세 번째에 추가 처방을 중단한다. Claude 검토 전에 동일 방식의 네 번째 수정 제안을 반복하지 않는다. 사용자가 원점 재검토를 지시하면 3회를 기다리지 않는다.
- Git 기록 순서: **문제 → 시행착오 → 결정 과정 → 기존 전제를 다시 묻는 질문 → 증거·관련 커밋 → 다음 할 일**. 확인된 사실, 추정, 미측정 결과, 확정 정책, 미확정 제안을 분리한다.
- 인계 파일: `docs/research/HANDOFF-REVIEW-YYYYMMDD-<issue>.md`. 기존 관련 기록이 있으면 갱신한다. 브랜치·기준 커밋·PR과 반복 횟수를 적고 필요한 최소 증거를 첨부한다.
- Claude의 역할: GPT의 코드 수정안을 추인하는 것이 아니라 고객 목표와 관찰 사실부터 문제를 독립적으로 재정의하고, 기존 접근을 유지·수정·폐기할 근거와 가장 작은 검증 방법을 제시한다.
- 검토 이후: GPT와 Claude의 동의·반대·새 가설을 Git에 남기고, 기존 합의와 충돌하는 변경은 사용자 승인 대상으로 올린다. 모델끼리 동의했다는 사실만으로 확정하거나 구현하지 않는다.
- Git 커밋, Claude 전달, Claude 검토 완료는 별개다. 자동 호출의 실제 실행을 확인하지 못했으면 커밋 경로를 전달하고 검토 대기로 기록한다.
- 충돌 확인: 기존 최상위 제품 원칙을 수행하기 위한 절차 보완이다. 사실성·검증상태 구분과 개발 승인 경계는 유지한다. 이번 결정은 검토 문서 기록을 허용하며 앱 코드 수정·PR 머지·배포·자동 Claude 호출 설정을 승인하는 것은 아니다.
- 규칙 본문: `docs/GLI_MASTER_BUSINESS_HANDOFF.md` §1.1.
