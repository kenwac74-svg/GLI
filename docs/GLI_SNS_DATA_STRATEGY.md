# GLI SNS & External Information Collection Strategy

관리 담당: 현재 GPT 총괄 사업기획·PM(S-PM). 2026-10-14 기록.
사용자 지시에 따라 `GLI SNS 정보 수집 전략` 세션의 향후 업무와 미해결 과제는 PM 대화에서 통합 관리한다. 역할과 구조기획 연결은 [GLI_PM_SESSION_CONTROL.md](GLI_PM_SESSION_CONTROL.md) §0을 따른다.

Status: partial reconstruction from confirmed GLI planning context. Exact source-by-source rules from the prior “GLI SNS 정보 수집 전략” chat were not recoverable in full and must not be invented.

업무 담당 통합은 원문 전체 복원을 뜻하지 않는다. 아래 기존 원칙·권고는 보존하되, `should`나 `recommended`로 기록된 제안을 원래 세션에서 사용자가 확정한 정책으로 승격하지 않는다. 이번에는 새로운 출처·수집주기·가중치를 정하지 않았다.

## 1. Objective

External/SNS collection exists to improve discovery and detect information that official or portal sources may miss.

It is not, by itself, proof that a fact is verified.

## 2. Source categories

GLI should conceptually separate:
- official/public authority sources
- developer/operator official sources
- established property portals
- agency/broker sources
- news/media
- social/SNS/community posts
- user-submitted information
- GLI partner/expert/field evidence

## 3. Discovery vs evidence

SNS and community information may:
- reveal new projects/listings
- reveal price changes
- surface local complaints or risks
- identify demand signals
- identify businesses/tenants/closures
- trigger additional investigation

But SNS claims should not automatically become confirmed evidence.

Recommended state by default:
- Source claim
- Investigation required
until independently corroborated where the claim materially affects a purchase/investment decision.

## 4. Collection behavior

- Preserve source identity, source URL, capture time, and original publication time when available.
- Normalize language, currency, area units, location, and asset identifiers.
- Do not merge away conflicting posts; preserve conflicts as evidence.
- Distinguish source-not-provided from crawler/parser failure.
- Avoid indiscriminate permanent storage of all scraped content.
- Store data that has been searched, selected, or linked to an asset/verification requirement, then recheck freshness when reused.

## 5. User-facing rule

External/SNS findings should be shown as useful context, not hidden merely because they are unverified.

User-facing labels should distinguish:
- public/official fact
- source claim
- market indication
- conflicting information
- additional verification needed

## 6. Verification escalation

When SNS/external information affects a material issue such as:
- ownership/title
- foreign-buyer eligibility
- active sale status
- actual rent
- occupancy/vacancy
- construction progress
- management disputes
- permits
- tenant/merchant status

GLI should escalate to a stronger source or expert/field verification before marking the item confirmed.

## 7. Items intentionally not fixed here

The following were not recovered with enough confidence and should be separately finalized rather than guessed:
- exact platform list by country
- platform-specific API/scraping method
- crawl interval/frequency
- source ranking weights
- Trust Score contribution
- alert thresholds
- retention period by source
- detailed legal/compliance rules for SNS scraping

이 항목들은 S-PM의 미완료 기록 회수·기획 과제다. 원문 미회수와 실제 미정은 구분하고, 새 결정을 내릴 때에는 기존 기록과 충돌 여부를 먼저 확인한다.

## 8. 구조기획과 함께 읽을 기존 기록

- [GLI_MASTER_BUSINESS_HANDOFF.md](GLI_MASTER_BUSINESS_HANDOFF.md) §0·§4·§5·§13: 범용 LLM 수준의 유용성을 최소선으로 삼고, 후보를 먼저 보여주되 근거 상태를 분리한다. 부족한 정보는 추가 수집 또는 사람 확인으로 연결한다.
- [P0-2_RESULT_SCREEN_DECISIONS.md, 1681e24](https://github.com/kenwac74-svg/GLI/blob/1681e248de7b728a99531d03bfe780e648d26a39/docs/research/P0-2_RESULT_SCREEN_DECISIONS.md) §1·§2: 고객의 반복 검색수요와 부족한 확인 후보를 집계하여 내부 조사 대상으로 삼는 방향. 사용자에게 조사방법 설계를 떠넘기지 않는다.
- 같은 결정 기록 §3: 무엇을 저장할지와 수요 집계·조사 대상 화면의 세부는 미결정이다. 사용자 검색기록을 무제한 원문 저장한다는 승인으로 해석하지 않는다.
- [GLI_CLAUDE_RESEARCH_HANDOFF.md](GLI_CLAUDE_RESEARCH_HANDOFF.md) §7: 국가별 출처·접근·주기·비용을 조사할 미확정 과제. 연구 의뢰는 조사 결과가 아니다.

위는 현재 확인 가능한 다른 GLI 기록과의 연결이다. 두 과거 세션의 전체 원문을 복원한 결과라고 주장하지 않는다. 구체적 소스 수집·자동화·유료 실행은 이번 업무 통합에 포함하지 않는다.
