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
