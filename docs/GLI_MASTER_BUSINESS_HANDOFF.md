# GLI Master Business Handoff

## 0. Highest-level product principle

This principle takes precedence over all lower-level GLI search, verification, AI, data, and UX rules.

> **범용 LLM보다 검색·상담이 못하면 실패한다. 범용 LLM이 할 수 있는 것은 최소한 다 해야 하며, GLI의 차별성은 그 이후 사용자가 해야 할 일을 대신 수행하는 데 있어야 한다.**

Operational interpretation:

1. GLI must meet or exceed the practical usefulness, speed, breadth, and conversational quality that users can already obtain from leading general-purpose LLMs for overseas property discovery and initial advice.
2. Verification rules must not make GLI less useful than a general-purpose LLM at the discovery stage.
3. Generic LLM capabilities are the baseline, not the moat.
4. GLI's added value begins after discovery: normalization of foreign information, evidence-state control, additional research, expert/field verification, persistent Verification Records, transaction support, and later compliant fractional/RWA access.
5. When a lower-level rule conflicts with this principle, the lower-level rule must be revised rather than degrading the user experience.

Canonical product sequence:

> **Find well → Explain clearly → Show confidence/evidence → Investigate what is missing → Execute the next step**

Updated: 2026-10-08  
Scope: business/product planning canonical handoff for Cloud Chat ↔ GitHub ↔ Local Work/Codex.

## 1. Operating rule

- This repository document is the canonical business-planning handoff.
- Business/product discussions happen in Cloud Chat/Project.
- GitHub stores confirmed decisions and durable handoff context.
- Local Work/Codex is an execution environment for code/files and must read this document before work.
- Do not treat an AI chat session as the only source of truth.
- New policy must first be checked for conflict with existing decisions.
- Code, UI, DB, deployment, and Git changes originating from business planning must be separated as **Development Team Proposal** until explicitly approved for implementation.

### 1.1 GPT–Claude 공동 검토: 동일 문제의 코드 수준 답변 3회 반복 시 중단

상태: **사용자 확정, 2026-10-08.** 이 규칙은 최상위 제품 원칙을 실행하기 위한 협업 절차이며, 기존의 사실성·검증상태 구분이나 코드·배포 승인 요건을 완화하지 않는다.

목적은 GPT의 결론을 Claude에게 추인받는 것이 아니라, 하나의 대화 맥락과 기존 설계에 매몰되어 문제 정의를 다시 보지 못하는 상황을 끊는 것이다. Claude와의 연구는 GLI의 정상적인 공동 협업 방식이다.

**발동 조건**

- 같은 미해결 사용자 문제를 해결한다며 코드 변경 수준의 답을 **3회 이상 반복하면**, 세 번째에 추가 처방을 멈추고 독립 검토로 전환한다. 네 번째 유사 코드 수정 답변을 이어가지 않는다.
- 실제 코드를 수정한 횟수뿐 아니라, 코드·프롬프트·필터·타임아웃 등의 국소 수정 제안만 반복한 경우도 센다. 표현이나 파일명을 바꿔도 같은 문제와 접근이면 횟수를 초기화하지 않는다.
- 이는 컨텍스트 매몰의 **운영상 경고 기준**이지, 모델 내부 원인이 입증됐다는 진단은 아니다. 사용자가 먼저 원점 재검토나 Claude 의견을 요구하면 3회까지 기다리지 않는다.
- 서로 다른 문제를 해결하는 정상적인 다단계 작업을 무조건 합산하지 않는다. 진행 중인 동일 문제의 반복 횟수는 핸드오프에도 남겨 세션 변경으로 사라지지 않게 한다.

**발동 후 순서**

1. 동일 문제에 대한 추가 국소 수정 제안을 중단하고, 고객이 원한 경험과 아직 해결되지 않은 현상을 다시 적는다. 사용자가 원하는 결과와 현재 시스템의 제약을 혼동하지 않는다.
2. `docs/research/HANDOFF-REVIEW-YYYYMMDD-<issue>.md`에 검토용 기록을 작성한다. 기존 기록이 있으면 중복 생성 대신 이어 쓴다. 대상 저장소·브랜치·기준 커밋·PR을 명시한다.
3. 문서와 필요한 최소 증거만 GitHub에 커밋하고 실제 저장 여부를 확인한다. 이 협업 규칙은 해당 GLI 검토 문서를 기록하는 권한이며, 앱 코드 수정·머지·배포·유료 실행에 대한 포괄 승인은 아니다. API 키, 개인정보, 비공개 원문 전체를 불필요하게 넣지 않는다.
4. Claude가 기존 해법을 전제로 삼지 않고 문제부터 검토하도록 전달한다. Git에 있는 근거는 파일 경로와 커밋으로 참조한다. Git 커밋 완료, Claude에게 전달됨, Claude 검토 완료를 서로 다른 상태로 기록한다. 자동 호출이 연결되어 실제 실행된 사실이 없으면 전달 경로를 제공하고 **Claude 검토 대기**로 남긴다.
5. Claude 의견이 돌아오면 동의·반대·새 가설·추가로 필요한 증거를 비교해 같은 기록에 남긴다. 검토 전에는 같은 방식의 네 번째 처방을 진행하지 않는다. 새 방향은 기존 합의와 충돌 여부를 확인하고, 변경이 필요한 정책·개발안은 사용자 승인 대상으로 분리한다. 다른 모델의 의견이라는 이유만으로 자동 채택하지 않는다.

**검토 문서의 순서**

- 문제: 사용자의 실제 목표, 고객 장면, 성공 기준, 관찰된 실패.
- 시행착오: 1·2·3차 제안 또는 변경, 각각의 근거·기대 효과·실제 결과. 미실행·미측정은 그대로 표시.
- 결정 과정: 어떤 전제를 채택했는지, 무엇을 배제했는지, 왜 현재 방법을 반복했는지에 대한 근거 중심 요약. 확인된 사실과 GPT의 해석을 구분.
- 원점 질문: 코드가 아니라 문제 정의·UX·상품 범위·데이터 가정·운영 방식부터 바꿔야 하는가. 기존 방향을 반증하는 자료와 미해결 질문을 포함.
- 인계 자료: 재현 절차, 관련 파일·커밋·PR, 화면/로그 등 최소 증거, 확정 정책과 미확정 제안의 경계.
- 다음 할 일: Claude에게 요구할 독립 의견, 가장 작은 확인 실험, 사용자 결정이 필요한 항목, 중단 상태와 재개 조건.

Claude는 우선 고객 목표·관찰 사실·진짜 제약을 보고 독립적인 문제 정의를 제시한 뒤, 기존 시도와 비교한다. 성공 기준은 모델 간 합의가 아니라 사용자가 체감하는 개선이다. 단순 작업마다 복수 모델을 호출하거나 추론량을 늘리는 방식으로 이 규칙을 대체하지 않는다.

## 2. GLI product thesis

GLI is not primarily a real-estate search chatbot. Its role is to reduce the barriers to accessing overseas real assets.

### Web2 layer
Solves:
1. Information accessibility
2. Trust/verification accessibility
3. Transaction accessibility

### Web3+ layer
After the relevant legal/regulatory environment is ready, adds:
4. Capital accessibility — enabling smaller investors to participate in verified overseas real assets through compliant fractional/RWA structures.

North-star concept:

> Discover → Verify → Invest

Web2 must be able to survive as an independent business before Web3+ is relied upon.

## 3. Current market positioning

GLI should not compete on generic AI property search alone.

Generic AI and property portals can increasingly provide:
- natural-language search
- candidate recommendations
- public market summaries
- basic ROI calculations
- public legal/regulatory summaries
- links to live listings

GLI must create value after and around those functions:
- normalize foreign-language listings inside GLI
- show useful candidates immediately
- distinguish what is known, claimed, inferred, missing, conflicting, or verified
- identify what additional evidence is needed
- automatically collect more information where possible
- route unresolved items to local experts/partners/field inspection
- return results as a persistent verification record
- support consultation and transaction execution
- later, convert suitable verified assets into compliant fractional/RWA opportunities

## 4. User-experience principle

Canonical UX rule:

> **먼저 찾아준다 → 얼마나 믿을 수 있는지 보여준다 → 부족하면 GLI가 더 알아본다.**

The user should not experience GLI as a “correct-answer exam.”

### Discovery first
When a user asks for something such as “베트남에서 월세 잘 나오는 방이나 상가 찾아줘”:
- interpret the real investment intent
- provide plausible candidate regions/projects/listings immediately
- show useful public information in the user’s language
- do not hide candidates merely because they are not fully verified

### Verification second
For each candidate, separate:
- confirmed fact
- source claim
- market estimate/inference
- partial confirmation
- conflict
- additional investigation required
- currently unverifiable
- risk signal

Do not turn “not yet verified” into “no answer.”

### Follow-up action
If GLI lacks the necessary information:
1. collect more information automatically, or
2. create/route an expert or field-verification task,
then return the additional result to the user.

## 5. Discovery and Verification are separate systems

### Discovery
Purpose: maximize usefulness and candidate quality.

Outputs may include:
- external listings
- GLI-discovered assets
- partner-supplied assets
- public market data
- hypotheses/estimates clearly marked as such

### Verification
Purpose: control trust and evidence quality.

Verification must not delete useful discovery results solely because evidence is incomplete. It should attach a state and required next action.

## 6. Verification model

### Asset-level progression
Collected → Online review in progress → Online review complete → Expert verification required → Field verification scheduled/in progress → Expert review complete → Conditional verification or GLI verified

Online review complete is never equivalent to GLI verified.

### Item-level states
- Confirmed
- Source claim
- Partially confirmed
- Conflict
- Investigation required
- Unverifiable
- Risk signal
- Not applicable

Collection/parsing failure must remain distinct from “source does not provide this field.”

### Trust architecture
- LLMs explain; they do not directly write Trust Score or verification state.
- Deterministic/server rules and approved evidence determine state and score.
- Human review is required for highest-trust bands.
- Trust Score, Asset Quality, and Buyer Fit remain separate concepts.

## 7. Human verification is a normal workflow, not an AI failure fallback

For target markets with fragmented or partially offline information, human verification is part of the normal product.

Possible actors:
- field investigator
- local real-estate consultant
- lawyer
- tax/accounting specialist
- building/technical specialist
- GLI reviewer/approver

Field work should use structured checklists and evidence such as GPS/time-stamped images, interviews, actual travel time, occupancy, management state, competing businesses, noise/traffic, and discrepancies between online claims and reality.

## 8. Asset scope

GLI covers:
- Residential
- Commercial
- Leisure
- Project investment opportunities

Verification extends beyond legal title.

Examples:
- residential: schools, medical access, fire/safety, security, transport, noise, flooding, management, actual rent, vacancy
- commercial: trade area, foot traffic, competitors, vacancy/closures, parking/loading, utilities, permits, rent economics
- leisure: tourism demand, seasonality, licenses, occupancy, operator quality, maintenance, climate/disaster risk
- projects: sponsor, rights/permits, financing, use of funds, partners, progress, recovery and downside structure

## 9. Product and monetization

### Account membership
Explorer / Investor / Private remain account-level access products.

### Asset information/value levels
- Free = discovery
- Basic = comparison
- Standard = decision support
- Premium = expert confirmation
- Business = transaction execution / high-cost investigation

Higher tiers mean stronger evidence and higher verification responsibility, not merely more text.

New high-cost investigation, field visits, legal/tax/technical work, negotiation, and execution must not be treated as unlimited membership benefits.

### Revenue reality
Membership is not assumed to be the main profit engine.
Web2 must validate paid demand for:
- asset-level analysis
- expert confirmation
- field inspection
- transaction support
- reusable verified reports

A critical KPI is **verification-information reuse rate**. If every new customer requires full new manual work, GLI becomes a consulting business rather than a scalable platform.

## 10. Web2 → Web3+ strategy

Web3+ is not the current product dependency.

Web2 should accumulate:
- user demand data
- verified asset records
- country/source profiles
- expert/partner network
- actual rent/occupancy/transaction evidence
- verified operating costs and risks

Only after regulation allows and the Web2 business proves demand should verified assets become candidates for compliant fractional/RWA investment.

Web3 technology itself is not the moat. The moat is the pipeline:

> Discovery → Verification → Acquisition readiness → Fractionalization/Distribution

## 11. Competitive interpretation

### BuildBlock
Closest on AI + overseas property + public-data/expert workflow, but centered on data-rich U.S. infrastructure.

### RENOSY
Strong property-investment marketplace and lifecycle platform. Proven at buy/manage/sell; not the same as an independent multi-country verification layer.

### RUMAVI / local due-diligence boutiques
Evidence that independent buyer-side verification/advisory demand exists. These can be competitors, benchmarks, or local execution partners depending on scope.

### Generic AI + property connectors
A major structural threat to Free/Basic/part of Standard. GLI should not overinvest in features generic AI can provide cheaply.

## 12. Partner asset principle

Commercial/marketing partnership does not equal GLI verification.

Partner-supplied assets must still distinguish:
- commercial relationship
- source-provided information
- GLI-confirmed information
- expert/field-verified information

Trust status must not be raised because GLI receives marketing or transaction compensation.

## 13. Data/source policy

Known agreed principles:
- preserve original source and original URL
- keep source currency and show converted user-language currency
- preserve posting/update time where available
- store searched/needed data selectively rather than indiscriminate full crawling
- recheck freshness against the original source when reused
- treat source-missing fields as an investigation state, not silently as null/error

Detailed SNS source lists, collection cadence, weights, thresholds, prompts, and partner-network internals remain to be finalized or retained as trade secrets where appropriate.

## 14. Cost discipline

GLI’s biggest structural weakness is capital intensity before Web3+.

Therefore:
- Web2 must generate independent revenue
- do not build global coverage before paid demand is proven
- do not build features merely because they may be useful later
- prioritize functions that either generate Web2 revenue within a reasonable horizon or create indispensable reusable assets for Web3+
- start with a limited number of target countries and scalable partner-based execution

## 15. Current business priority

Before expanding scope, optimize the product around this experience:

1. User asks naturally.
2. GLI immediately returns useful candidates.
3. External foreign-language data is normalized and shown inside GLI.
4. Each candidate clearly shows evidence status and missing information.
5. GLI proposes or starts the next verification step.
6. Results return to the user as a persistent verification record.
7. If desired, the user proceeds to consultation/transaction support.
8. In the future, eligible verified assets may proceed to compliant Web3+/RWA structures.
