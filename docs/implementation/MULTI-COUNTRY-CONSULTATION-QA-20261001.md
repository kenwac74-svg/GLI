# Multi-country consultation QA (2026-10-01)

## Scope and results

Three actual local consultations at localhost:8776/explore. No product, design,
configuration, keys, commit, push or public deployment changed. These tests
verify asking-price discovery, not signed leases or net income.

1. `베트남 호치민에서 월 1,500달러 이하의 2베드룸 콘도 임대 매물을 찾아줘.`
   Five HCMC/2-bedroom rent candidates from Dot Property Vietnam:
   Feliz En Vista 85sqm/27M VND; Vinhomes Golden River 69sqm/28M,
   68.2sqm/30M and 71.9sqm/30M; Lumiere Riverside 76.8sqm/37M per month.
   Korean titles/locations and KRW displayed (27M=1,411,500; 28M=1,463,777;
   30M=1,568,333; 37M=1,934,277 KRW/month). Advisor used reference USD,
   asked move-in date, not FX, and did not invent availability/CAM/deposit.
   Summary remains TOP3, full results five. Different sizes/prices are not
   proven duplicates despite same-project titles.
2. Follow-up: `이번에는 필리핀에서 월 70,000페소 이하의 2베드룸 콘도 임대 매물을 찾아줘.`
   Philippines/rent/2-bedroom chips changed, but zero candidates. Advisor
   limited absence to current supplied data and asked preferred city.
   PH candidate translation/KRW display could not be validated. Zero may be
   inventory, discovery or criteria related; cause not established.
   Screenshot: work/qa/multi-country-ph-20261001.png.
3. Top input, same conversation:
   `국가는 아직 정하지 않았어. 캄보디아, 베트남, 필리핀에서 2억 원 이하로 살 수 있는 콘도 후보를 비교해줘.`
   Zero candidates; Vietnam/sale/KRW200M/2-bedroom chips. Advisor explicitly
   said Vietnam two-bedroom sale scope and asked about smaller units.
   Three-country comparison failed. Top input retained conversation/bedrooms;
   this was not a clean-session test.
   Screenshot: work/qa/multi-country-comparison-20261001.png.

## Findings (not implemented)

- High: lib/search.ts has singular country and first-matching country patterns
  (Vietnam precedes others); API route dispatches one country collector.
  Explicit multi-country scope and per-country coverage are needed. This
  explains scope loss, not every zero-result cause.
- Investigate PH zero using interpreted criteria and collector status. The
  deterministic budget parser recognizes USD/KRW, not PHP/VND. AI intent may
  still interpret PHP, so parser limitation is not proven cause of this zero.
- Clarify new top-input search versus follow-up/reset semantics. No arbitrary
  UI redesign is authorized by this test request.
- Existing FX cache is up to 23h, not tick-realtime; KRW budget parser uses
  demo USD rate. Static platform metrics are not live discovery counts.

## Execution and verification

Initial stale page failed hydration (dynamic Vite browser-module fetch); first
click did not submit. Existing dev script restarted, fresh tab worked. No
permanent code fix/root cause established. Three actual POST200 durations in
local log: 36.8s, 29.5s, 15.0s. Provider token/cost/individual latency not measured.
Final comparison tab kept open. No extra model comparisons. Documentation-only
spec check and scoped diff review; no full build for this QA report.
