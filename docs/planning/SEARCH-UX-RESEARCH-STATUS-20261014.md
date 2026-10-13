# Search UX research: status and approval boundary

## User clarification (2026-10-14)
- PR3 and the refined A prototype are Claude's alternatives developed under the user's direction to address fundamental search/consultation problems. They are NOT an approved product design or implementation order.
- Wording such as approved, planner decisions D1~D11, or A selected in the research handoff must not be treated as current permission to replace the UI, relax evidence policy, modify prompts or merge/deploy the PR.
- Current deployed version69 and the research fork are separate. Today's menu/basic-condition discussion is design direction; detailed application and implementation remain to be settled.

## Exact evidence
- PR: https://github.com/kenwac74-svg/GLI/pull/3 (open when checked).
- Research commit:1681e248de7b728a99531d03bfe780e648d26a39, claude/exciting-curie-3i6mqe.
- Read remotely: docs/research/HANDOFF-RESULT-SCREEN-FORK-20261008.md and P0-2_RESULT_SCREEN_DECISIONS.md. Not merged/copied over the current application.
- The latest commit's report says documents/static assets only; the whole PR ALSO includes earlier search/client/AI code changes. Those need separate current-source review, not whole-PR adoption.
- Reported35~60s/11-of16 zero-candidate measurements describe2026-10-07, not a fresh version69 measurement. Concurrent probes and other limitations remain part of the evidence.
- Attachment: A 다듬은 안 (눌러 볼 수 있는 시안)-html.zip. Inventory only: Prototype.dc.html, support.js, vendor/react.js, vendor/react-dom.js, README.md. No execution/click validation claimed.

## Review sequence
1. Separate observed customer problems, Claude's causal hypotheses, proposed solutions and actual user approvals.
2. Inspect the supplied interactive prototype and evaluate customer flow, not just a scenario scorecard.
3. Combine today's compact asset menu/basic-condition buttons/multi-selection direction with useful result-screen ideas without presuming A's layout is approved.
4. Decide where general guidance ends and source-backed price/income/legal/asset claims begin; do not silently weaken evidence safeguards.
5. Present the integrated design and server/UI condition/result contract for user approval before implementation.

## This update
- Approval-boundary documentation only. No product/UI/prompt/config/DB/model changes, paid calls, collection, build, merge, commit/push or deployment.

## Fundamental goal and current discussion (user,2026-10-14)
- Fundamental problem: perceived usefulness of GLI answers is below ordinary Gemini. Fixing individual bugs or making prettier UI is not the research goal.
- Baseline: natural/helpful/general guidance; GLI adds acquired assets, images, provenance, verification and useful next actions. No fabricated prices/income/legal/asset facts.
- General guidance versus acquired/verified claims must remain distinct. Claude's proposed relaxation/streaming/two-column A is a research alternative, not approval to implement it.
- Top menu should be intuitive asset-list shortcuts, not a long duplicate of all filters. Proposed compact contents: GLI verified assets, divider, asset types. Menu/AI names are still proposals.
- Replace long example-question buttons with basic condition controls ABOVE the free-text question; remove technical instructions that consume space without helping the customer.
- Country buttons: flag icon/name. Interest-condition buttons combine asset/transaction meanings for customers; internal classification remains server-owned.
- All groups allow multiple selections. No selection means ALL; click selects, second click deselects; last deselection returns ALL. New tags must fit the same extensible system.
- Intended interpretation discussed: choices within a dimension widen scope; different dimensions combine (Vietnam/Philippines; sale/rent; leisure+rent). No application contract/schema change yet.
- Main research continues in the user's GLI 연구 및 사업기획 session. User will return here at development-planning stage. Do not start architectural implementation or message/fork another session automatically.
- User requested GitHub preservation of current notes; concrete existing bugs may be corrected LOCAL only. No public redeployment, new approved UI redesign, PR3 merge or paid AI calls.
