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

Updated: 2026-10-06  
Scope: business/product planning canonical handoff for Cloud Chat ↔ GitHub ↔ Local Work/Codex.

## 1. Operating rule

- This repository document is the canonical business-planning handoff.
- Business/product discussions happen in Cloud Chat/Project.
- GitHub stores confirmed decisions and durable handoff context.
- Local Work/Codex is an execution environment for code/files and must read this document before work.
- Do not treat an AI chat session as the only source of truth.
- New policy must first be checked for conflict with existing decisions.
- Code, UI, DB, deployment, and Git changes originating from business planning must be separated as **Development Team Proposal** until explicitly approved for implementation.

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
