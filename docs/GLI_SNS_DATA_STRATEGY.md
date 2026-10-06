# GLI SNS & External Information Collection Strategy

Status: partial reconstruction from confirmed GLI planning context. Exact source-by-source rules from the prior “GLI SNS 정보 수집 전략” chat were not recoverable in full and must not be invented.

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
