# GLI Claude Research Handoff

Updated: 2026-10-06  
Status: **Research-only / unresolved issues**  
Audience: Claude or another independent research/review model  
Purpose: Re-examine GLI from first principles without overwriting already confirmed decisions.

---

## 0. Read this first

This document contains **unresolved research questions, hypotheses, risks, and options**.  
It is intentionally separated from confirmed business decisions.

Before doing any research, read these GitHub documents as the canonical confirmed baseline:

1. `docs/GLI_MASTER_BUSINESS_HANDOFF.md`
2. `docs/GLI_DECISION_LOG.md`
3. `docs/GLI_SNS_DATA_STRATEGY.md`
4. `docs/GLI_DEVELOPMENT_PROPOSALS.md`
5. `README.md`

Rules:

- Do **not** silently convert a research hypothesis into a GLI policy.
- If a proposed conclusion conflicts with the canonical documents, explicitly identify the conflict.
- Separate:
  - confirmed decision
  - working hypothesis
  - external fact
  - inference
  - unresolved question
  - development proposal
- Be critical. The objective is not to justify GLI, a patent, Web3, or an existing architecture.
- The objective is to determine whether GLI can create a product users prefer, a business that can survive, and defensibility worth protecting.

---

# 1. Highest-level question

The current highest-level product rule is already confirmed:

> **If GLI gives a slower, less detailed, or less practically useful answer than a leading general-purpose LLM, GLI has failed at the first user-value layer. General-purpose LLM capability is the minimum baseline, not GLI's differentiation.**

Claude should therefore analyze GLI from this starting point:

### Core research question

> **What must GLI do beyond Gemini/ChatGPT-class discovery and advice so that users have a compelling reason to use GLI, pay GLI, and remain inside GLI through the transaction lifecycle?**

Do not assume the answer is “verification.”  
Verification is currently the strongest candidate, but its customer value, willingness to pay, scalability, and differentiation still require proof.

---

# 2. Product architecture: reopen from first principles

## 2.1 Current working hypothesis

A three-layer structure is being considered:

1. **Open Discovery**
   - Search broadly across the web, portals, developer sites, partner inventory, public data, news, SNS/community sources, and GLI inventory.
   - Return useful candidates even when not fully verified.
   - Behave at least as helpfully as Gemini/ChatGPT.

2. **Verified Inventory Search**
   - Search only GLI-controlled, partner-fed, or sufficiently verified inventory.
   - Strong structured filtering, freshness, status, ownership eligibility, currency normalization, and semantic ranking.
   - The recently produced document `GLI 글로벌 부동산 시맨틱 검색 기술 핸드오프 기획서 v1.2` fits this layer better than it fits the entire GLI search strategy.

3. **Verification / Execution**
   - Determine what is known, claimed, missing, conflicting, or unverifiable.
   - Conduct additional automated research.
   - Route unresolved items to local experts, lawyers, consultants, investigators, developers, managers, or field inspection.
   - Build a persistent Verification Record.
   - Support consultation and transaction execution.

This is **not yet a fully approved architecture**. It is a research hypothesis.

## 2.2 Questions Claude must challenge

- Is a three-layer model necessary, or can one orchestration layer handle all three without UX complexity?
- Should “Verified Inventory Search” exist as a separate subsystem, or just as a source tier in Open Discovery?
- Should verification begin automatically for every candidate, only after user interest, or only after payment?
- Which parts must be real-time and which can be asynchronous?
- How much evidence-state detail should be visible to normal consumers before it creates friction?
- Does a Verification Record create real customer value, or mostly internal process value?
- Does the “GLI verifies after discovery” model create enough differentiation from global brokerages, law firms, portals, and buyer-side advisors?

## 2.3 Search-spec issues requiring research

The semantic-search handoff v1.2 proposes:
- NL-to-JSON parser
- RDB hard filter
- pgvector semantic ranking
- `status = AVAILABLE` gating
- foreign-quota gating
- only 3–5 DB-backed properties sent to the answer synthesizer
- 0-hallucination target
- P95 latency targets
- small-model fine-tuning for query parsing

Research whether these are appropriate given the highest-level product rule.

Specific unresolved questions:

- Does `AVAILABLE` mean “source says active,” “partner says active,” or “GLI independently reconfirmed active”?
- Should “foreign quota available” be a hard filter if the fact itself may be unverified?
- Should foreign ownership eligibility be an evidence state instead of a strict early filter?
- Does SLM fine-tuning add meaningful business value when general LLMs already parse ambiguous property intent well?
- Is sub-second parsing worth engineering effort compared with broader discovery quality?
- Should qualitative intent such as “월세가 잘 나오는 곳” be decomposed into research requirements (rent, vacancy, tenant profile, management cost, lease term) instead of only an embedding query?
- How should the system avoid making the database itself a false source of truth?

Deliverable requested:
- A critical architecture review with **keep / modify / reject / test first** labels for each major search component.

---

# 3. General-purpose LLM parity benchmark

GLI currently uses multiple LLMs/API orchestration, yet a direct Gemini answer was observed to be faster, richer, and more actionable than GLI for a query such as:

> “베트남에 월세 잘 나오는 물건, 투자금은 상관 없으니까 건물 말고 임대용 방이나 상가중에 찾아”

Gemini produced:
- candidate cities/districts
- named projects
- likely tenant profiles
- rough rent ranges
- live Batdongsan listing links
- CBRE/Savills follow-up channels
- foreign ownership cautions
- follow-up checks

GLI, despite using multiple models, gave a more constrained and less useful result.

## Research task

Design a benchmark that tests GLI against leading general-purpose LLMs on:
- speed
- breadth of discovery
- specificity
- live-source usefulness
- relevance to investment intent
- multilingual handling
- transparency of uncertainty
- quality of next action
- ability to continue the task after discovery

Benchmark should include at least:
- Vietnam rental-investment search
- Cambodia condo purchase
- Philippines RLC-linked property search
- Thailand foreign-buyer condo
- commercial retail investment
- lifestyle/residential search with qualitative criteria

Do not optimize only for factual exactness.  
Measure **practical usefulness to a real user**.

Deliverable requested:
- Benchmark protocol
- Example prompts
- scoring rubric
- recommended minimum parity threshold before GLI claims AI-search differentiation

---

# 4. Market/category definition

## 4.1 Confirmed strategic concern

GLI must not be defined merely as:
- AI property search
- overseas property chatbot
- RAG real-estate assistant
- generic foreign-property advisory

Those areas are increasingly commoditized.

## 4.2 Competitors / adjacent players to research

Research each from the customer’s perspective, not only technical architecture.

### BuildBlock
Questions:
- What does the consumer actually buy?
- How much of the workflow is U.S.-specific because of mature public/MLS/title/tax infrastructure?
- How much of its confidence/expert fallback overlaps with GLI?
- Could BuildBlock expand into Southeast Asia without changing its architecture substantially?
- Does BuildBlock have patents/applications relevant to GLI?
- Which differences are meaningful to customers versus meaningful only to engineers?

### RENOSY / GA technologies
Questions:
- What are the real revenue engines?
- What percentage is transaction margin, management, financing, resale, subscription, or software?
- Which overseas markets are active?
- Does RENOSY’s lifecycle model make verification a feature rather than a product?
- Could GLI economically compete if it drifts toward “recommend → buy → manage → sell”?

### RUMAVI
Questions:
- Actual revenue, customers, completed transactions, AUM/advised figures, growth, hiring.
- Distinguish founder prior experience from post-launch company traction.
- Does Korean-language localization translate into real Korean customer acquisition?
- Is RUMAVI more competitor, benchmark, or potential partner?

### Suradeed / TOMA Guide / local due-diligence boutiques
Questions:
- Are these competitors or supply-side partners for GLI?
- Typical price, direct cost, turnaround, legal liability, scope, repeat purchase.
- Are they willing/able to provide structured B2B verification outputs to a platform?
- Can their reports be standardized and resold within legal/contractual limits?

### Global PMC
Questions:
- How much of GLI’s buyer-side overseas advisory/partner model already exists?
- What customer segment do they serve?
- How scalable is their consulting structure?
- Could they be a partner rather than direct competitor?

### RSQUARE
Questions:
- Particularly for commercial/project assets in Vietnam/SEA, how strong is their proprietary field-data moat?
- Where would GLI be clearly weaker or redundant?
- Should GLI avoid head-on B2B commercial competition?

### ChatGPT property connectors / country property apps
Questions:
- Which markets are already directly reachable inside ChatGPT?
- Why are mature-data markets represented sooner than fragmented SEA markets?
- Is “GLI as a ChatGPT/AI verification connector” a viable distribution model?
- Would that reduce GLI customer-acquisition cost or weaken direct customer ownership?

Deliverable requested:
- Competitor map by **customer / job-to-be-done / revenue model / human intensity / geographic coverage / defensibility / potential partnership**
- Explicit answer: **What market category should GLI claim, if any?**

---

# 5. Customer-visible differentiation

Technical uniqueness is not enough.

Research what a user can actually perceive and pay for.

Candidate value proposition under examination:

> “Bring GLI any overseas property you found anywhere. GLI translates, normalizes, investigates, verifies what matters, coordinates local execution, and keeps a persistent record until you can make or execute the investment decision.”

Test whether this is:
- understandable within seconds
- materially different from Google/Gemini/ChatGPT + local broker/lawyer
- valuable enough to pay for
- scalable
- defensible

Important comparison:

General LLM:
> finds and explains

GLI candidate model:
> finds → explains → shows evidence state → investigates missing facts → coordinates human verification → supports transaction

Research whether customers actually want this integrated path or prefer:
- free AI first
- then directly contact a broker/lawyer
- bypassing GLI entirely

Deliverable requested:
- 3–5 alternative customer-facing positioning statements
- critique of each
- strongest “why GLI instead of Gemini + local expert?” answer

---

# 6. Country strategy and data-fragmentation thesis

A key GLI thesis is that mature markets and fragmented-information markets require different systems.

Working hypothesis:
- U.S./Singapore-type markets: public, transaction, tax, title, permit, MLS/portal ecosystems are comparatively structured.
- Cambodia/Vietnam/Indonesia/parts of the Philippines/Thailand: public availability, digitalization, access, title/usage-right structures, actual transaction-price visibility, and portal-to-public-record linkage vary substantially.

This thesis is important but must not be exaggerated.

## Research questions

For each of:
- Cambodia
- Vietnam
- Philippines
- Thailand
- Malaysia
- Indonesia
- Singapore

Map:
- title/land registry authority
- online public access
- transaction-price availability
- tax/assessment data
- permit/building data
- foreign ownership rules
- actual rental contract data availability
- property portal maturity
- APIs/data licensing
- identity/address normalization issues
- common offline verification requirements
- typical buyer due-diligence flow
- lawyer/notary/agent role
- realistic automation percentage

Then answer:
- Which 2–3 countries should GLI prioritize economically, not symbolically?
- Where is data fragmentation severe enough to create GLI value but not so severe that service costs destroy margin?
- Is Cambodia a good first commercial market or only a good technical proof-of-concept market?
- Does the Philippines RLC marketing relationship materially change country priority?

Deliverable requested:
- Country attractiveness matrix
- recommended initial rollout order
- country-specific verification-path examples

---

# 7. SNS and external-information strategy

The current GitHub SNS document is explicitly a partial reconstruction.

Exact source lists and operational rules are still unresolved.

## Research questions

Per target country:
- Which property portals matter?
- Which developer sites matter?
- Which broker databases matter?
- Which social channels matter (Facebook groups/pages, TikTok, YouTube, Telegram, local forums, Zalo, etc.)?
- Which sources are useful for discovery versus evidence?
- Which claims are commonly unreliable?
- What collection methods are legally and technically sustainable?
- What should be API, licensed feed, crawling, manual monitoring, or partner submission?
- What cadence is justified by price/status volatility?
- What should be stored permanently versus re-fetched?
- How should duplicates and conflicting listings be represented?
- Can SNS data materially improve rent/vacancy/tenant-demand estimates?

Do not assume more crawling is better.

Deliverable requested:
- source map by country
- source role: discovery / market signal / evidence / lead only
- cadence recommendation
- legal/ToS risk notes
- cost estimate

---

# 8. Trust Standard and evidence model

Confirmed:
- Trust Score ≠ Asset Quality ≠ Buyer Fit
- LLM does not write Trust Score or verification state
- online review ≠ final GLI verification

Unresolved:
- exact scoring formula
- exact ceilings
- exact evidence sufficiency rules
- exact expiration/freshness rules
- how much score detail the customer should see
- whether a single numeric score is even the best UX

The previous 50/70/85/95/100 ceilings were demo examples only.

## Research questions

- Should GLI keep a 0–100 Trust Score, or would categorical states be more honest/useful?
- Should legal/title certainty and rent-market certainty be separate trust dimensions?
- How should stale evidence decay?
- How should conflicting credible sources affect status?
- How should commercial-partner inventory avoid conflict-of-interest bias?
- How should GLI represent “source says available” vs “GLI reconfirmed available”?
- How should “foreign buyer eligible” be represented when only partially confirmed?
- What minimum evidence justifies “GLI verified”?

Deliverable requested:
- proposed Trust Standard v1
- customer-facing display examples
- internal evidence model
- auditability requirements

---

# 9. Human verification and partner network

Confirmed:
Human verification is a normal workflow in fragmented markets, not merely an AI fallback.

Unresolved:
- partner sourcing
- qualification
- QA
- SLA
- evidence format
- pricing
- liability
- dispute handling
- reinspection
- country coverage
- B2B subcontract vs marketplace model

## Research questions

Compare operating models:

A. GLI employs field staff directly  
B. GLI contracts local individuals  
C. GLI contracts local professional firms  
D. GLI uses verification platforms such as Suradeed  
E. Hybrid by task/country

For each, evaluate:
- gross margin
- scalability
- quality variance
- legal liability
- brand risk
- response time
- fraud risk
- ability to standardize evidence

Deliverable requested:
- operating model recommendation
- partner qualification framework
- standard evidence package
- draft SLA structure
- cost ranges by task type/country

---

# 10. Web2 monetization and unit economics

This is one of the most important unresolved areas.

Confirmed:
- Web2 must survive economically without relying on future Web3 revenue.
- Membership alone is unlikely to be the main profit engine.
- expensive new investigations cannot be unlimited subscription benefits.
- verification-information reuse rate is a critical scalability variable.

## Research questions

Test each revenue source:
- Explorer / Investor / Private membership
- per-asset Standard report
- per-asset Premium expert confirmation
- Business field/legal/technical diligence
- transaction referral/buyer-side fee
- developer/partner marketing fee
- resale of previously completed verification reports
- B2B API/data/verification service
- travel/inspection coordination
- property management referral
- later RWA distribution economics

For each estimate:
- willingness to pay
- direct cost
- gross margin
- CAC
- repeat frequency
- refund/dispute exposure
- reusability
- legal/regulatory constraints

## Critical questions

- At what verification reuse rate does GLI become a platform rather than consulting?
- What is the minimum viable paid workflow?
- Which tier should be the first real revenue product?
- Is Free/Basic/Standard mostly acquisition cost?
- What should the kill criteria be if paid demand is weak?
- How many paid cases per month are needed to sustain the Web2 team?
- Does a property buyer’s low purchase frequency make subscription economics structurally weak?

Deliverable requested:
- unit-economics model with conservative/base/upside cases
- break-even logic
- 12-month validation plan
- explicit kill/pivot thresholds

---

# 11. Commercial partnership vs independent verification

The RLC/RLC Residences marketing relationship highlights a strategic conflict.

Confirmed principle:
> Commercial/marketing partnership does not equal GLI verification.

Research:
- How should partner inventory be labeled?
- How should GLI disclose compensation?
- Can GLI credibly act as both marketing channel and independent verifier?
- Should some verification be performed by a legally/organizationally separate party?
- How should Trust/Verification rules prevent commercial bias?
- How do consumer-protection and advertising rules differ by country?

Deliverable requested:
- conflict-of-interest policy options
- partner-asset disclosure UX
- independent-review requirements

---

# 12. Patent and IP strategy: do not assume filing is the goal

Confirmed:
Patent is a means to improve business defensibility, not the objective.

Existing Web2 patent draft focuses on combinations such as:
- Source Profile
- sequential source calls based on evidence sufficiency
- source-missing vs collection-error state
- user-event-driven human verification tasks
- verification state transitions
- deterministic trust authority separated from generative explanation

Risk:
BuildBlock and other prior art overlap heavily with:
- real-estate RAG
- hybrid retrieval
- source attribution
- confidence threshold
- expert fallback
- multi-source validation

## Research questions

- After considering BuildBlock and broader prior art, is there any **commercially meaningful** claim scope left?
- Would the remaining claims be easy to design around?
- Are similar workflows already present in KYC, insurance claims, supply-chain due diligence, compliance, medical review, or other adjacent fields?
- Is the multi-country fragmented-data environment itself enough to create a non-obvious technical implementation, or only a business context?
- Which knowledge should remain trade secret instead:
  - exact source priorities
  - thresholds
  - scoring
  - prompts
  - partner network
  - country-specific verification procedures
- Is filing worth the cost relative to data/network/brand investment?

Also research:
- GLI public disclosure timeline
- GitHub public status and dates
- demo publication dates
- proposal/whitepaper sharing
- potential grace-period/public-disclosure implications

Deliverable requested:
- patent/no-patent decision memo
- claim-risk map
- patent vs trade-secret split
- cost/benefit view

---

# 13. Web3+ / RWA / fractional-investment phase

Confirmed strategic concept:
Web3+ solves **capital accessibility** after Web2 solves information/trust/transaction accessibility.

The original larger GLI thesis included:
- easier access to overseas real estate
- crowdfunding
- fractional participation
- later token/RWA structures
- enabling users with roughly KRW 1 million-scale capital to participate in overseas real assets

However, Web3+ planning is intentionally deferred until relevant regulation is clearer, expected no earlier than 2027 planning horizon.

## Research questions

Do **not** design the final token system yet.

Instead determine:
- What regulatory events in Korea/Singapore/target asset countries would trigger serious planning?
- Which structures are likely to be securities, collective investment, crowdfunding, tokenized securities, fund interests, SPV interests, or prohibited solicitation?
- What licenses/partners may be required?
- Can Web2 data/verification materially lower RWA underwriting cost?
- Which assets discovered in Web2 are suitable for later fractionalization?
- Does Web3+ genuinely expand the market, or merely add regulatory complexity?
- What Web2 objects/data should be built now because they will be valuable later, without prematurely building blockchain infrastructure?

Deliverable requested:
- regulatory watchlist
- trigger conditions for starting full Web3+ design
- minimal Web2 “optionality” requirements
- no unnecessary blockchain build before trigger

---

# 14. Business moat research

Candidate moats to test:

- proprietary verified asset records
- country/source profiles
- actual rent/occupancy/transaction observations
- standardized field evidence
- partner/expert execution network
- verification workflow data
- user demand/intent data
- repeatable report resale
- brand trust
- transaction integration
- later RWA sourcing pipeline

Research:
- Which of these compounds with scale?
- Which are easy for a funded competitor to copy?
- Which depend on volume before they become valuable?
- Which create switching costs?
- Which can be licensed/API-sold?
- Which are stronger than a patent?

Deliverable requested:
- moat ranking
- time-to-build
- capital required
- copying difficulty
- evidence needed to prove each moat exists

---

# 15. Scope and capital-intensity problem

A central weakness is the risk of building a very large platform before material revenue exists.

Research should explicitly test:
- smallest country scope
- smallest asset scope
- smallest expert-network scope
- smallest verification product that can generate revenue

Questions:
- Should first commercial focus be residential only?
- Should commercial/leisure/project stay in the taxonomy but be deferred operationally?
- Should Cambodia remain the first market, or should Vietnam/Philippines move ahead due to demand/data/partner economics?
- Does the RLC relationship justify a Philippines-first monetization test?
- Which features in current plans should be postponed because general-purpose AI already provides them?
- Which backend/admin functions are essential before the first 100 paid verifications?

Deliverable requested:
- minimum commercial scope
- “do not build yet” list
- capital-light rollout path

---

# 16. Research methodology requirements for Claude

For every research stream:

1. Use current public sources, not only GLI’s internal assumptions.
2. Prefer official/regulatory/company-primary sources.
3. Distinguish marketing claims from audited/independent evidence.
4. For competitor traction, separate:
   - founder prior experience
   - company post-launch performance
   - self-reported vs externally verified metrics
5. For legal/regulatory topics, state jurisdiction and date.
6. For market-size claims, avoid unsupported TAM inflation.
7. Where reliable data is unavailable, say so.
8. When a conclusion would change GLI policy, present it as a **proposed decision**, not a fact.
9. Highlight evidence that argues **against** GLI as strongly as evidence that supports it.
10. Prefer business survival and customer value over architectural elegance.

---

# 17. Priority order

Claude should research in this order unless evidence strongly suggests another sequence:

### P0 — Product survival
1. General LLM parity benchmark
2. Customer-visible differentiation
3. Minimum commercial scope
4. Web2 unit economics
5. Country rollout economics

### P1 — Operating model
6. Verification/partner network
7. Trust Standard
8. External/SNS/source strategy
9. Partner-asset conflict policy

### P2 — Defensibility and future option
10. Competitive moat
11. Patent/IP value
12. Web3+/RWA regulatory trigger framework

### P3 — Engineering implications
13. Open Discovery vs Verified Inventory architecture
14. semantic-search v1.2 keep/modify/reject analysis
15. detailed implementation recommendations only after business conclusions

---

# 18. Required final output from Claude

Produce a research package with:

## A. Executive conclusion
- Is GLI’s current direction commercially defensible?
- What should GLI **stop doing**, **keep doing**, and **start doing**?

## B. Decision table
For every major unresolved issue:
- issue
- current hypothesis
- evidence
- recommendation
- confidence
- impact
- whether it conflicts with confirmed GLI policy

## C. 12-month business validation plan
- target countries
- first paid product
- pricing hypotheses
- partner requirements
- metrics
- kill/pivot criteria

## D. Product architecture recommendation
Only after the market/business analysis:
- recommended discovery architecture
- verification architecture
- human workflow
- what remains generic-LLM functionality
- what GLI must own

## E. IP/RWA appendix
- patent decision recommendation
- trade-secret list
- Web3+ trigger conditions

---

# 19. Known source documents outside the GitHub canonical set

The following GLI documents have informed prior discussion and may exist outside the current Git repository:

- `GLI_Demo_Business_Product_Requirements_v1.0.docx`
- `GLI_GPT_Business_Planning_Handoff_2026-08-13.md`
- `GLI_Web2_Patent_Attorney_Handoff_v1.0.docx`
- `GLI 글로벌 부동산 시맨틱 검색 기술 핸드오프 기획서.pdf`
- prior chat/export covering detailed human verification, asset-quality, Buyer Fit, pricing tiers, and field-inspection concepts

Where these conflict with the GitHub canonical documents, **GitHub confirmed decisions take precedence unless the user explicitly changes policy**.

---

# 20. Final instruction

Do not optimize for proving that GLI is unique.

Try to falsify the business thesis.

The research is successful if it clearly answers:

> **Can GLI deliver at least the usefulness of a leading general-purpose LLM, then perform enough valuable real-world work after that answer to justify user trust, payment, and a scalable business?**

If the answer is no, say so and identify the least-cost pivot.
