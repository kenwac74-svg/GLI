# Multi-country consultation contract (P48)

User approved on 2026-10-01: a first question without geography searches the
connected Cambodia/Vietnam/Philippines scope. Follow-ups retain prior scope;
explicit countries/cities replace it. Known Cambodian districts imply Cambodia.
Explicit reset removes context. Explicit bedroom removal clears that constraint.
No new UI design or public deployment is included.

## Contract and execution

- SearchCriteria.countries is optional for backwards compatibility. When present
  it is the authoritative, unique allowed country list; country is a legacy anchor.
  Multi-country contexts have null city/district. Single-country/city boundaries
  remain hard; Malaysia only joins when explicitly requested, not as a connected
  default collector.
- Existing collectors run in parallel with allSettled. A failed country does not
  discard successful results. coverage/discovery.countries reports collected,
  partial or unavailable and collectedCount. Successful collection with zero
  assets differs from unavailable. Bounded discovery is not nationwide coverage.
- One observed exchange-rate snapshot governs budget and listing USD comparison.
  Acquisition/monthly-rent budget accepts KRW/USD/PHP/VND; income goals remain
  KRW/USD and do not become purchase ceilings. Missing needed FX blocks budget
  search rather than silently dropping the cap; no user-supplied FX request.
- Combined strict matches are ranked with the existing server ranking, maximum
  five for multi-country search. No country quotas. Original prices, sources,
  grades and identities remain unchanged. Existing TOP3 summary design remains.
- Same source URL may represent separate sale/rent offers; merging includes
  transaction to retain both. Similar posts on different URLs are not collapsed.
- Advisor gets actual scope and source coverage. It must not call failed collection
  no market inventory or claim that unavailable sources were searched successfully.

## Evidence and limits

Implementation: search.ts, consultation-intent.ts, consultation-search.ts,
multi-country-discovery.ts, api/search route, ai-search.ts, consultation-view.ts.
Tests: multi-country-search.test.mjs plus existing search/intent/view/advisor suites.
HIST-20261001-009 records current verification, not previous failed QA as success.
Legacy standalone searchAssets/validateIntent retain demo FX until an observed
snapshot is supplied; the public consultation path now supplies that snapshot.
FX remains a dated API reference with existing 23h cache, not live market ticks.
Durable ingestion, national coverage, actual net income and UI reset redesign
remain separate work. Held sources and SNS principles are not activated here.

Real local check (2026-10-01): PH 70,000 PHP/2-bedroom rent returned five;
no-geography 1,500 USD/2-bedroom rent showed KH/VN/PH scope but selected five
KH candidates. Existing score ties preserve collector order, so recommendation
diversity/optimality is not proven by scope success. Some PH title places remain
English. No source-order ranking redesign is bundled without a separate review.
