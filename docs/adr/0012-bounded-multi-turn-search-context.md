# ADR 0012: Bounded Multi-Turn Search Context

Status: Accepted

Date: 2026-07-31

## Context

The end-user experience must support consultative property discovery. A user
may first describe a lifestyle or investment goal and then answer with only a
budget, district, or bedroom preference. Treating each message as an isolated
query loses the original intent.

Sending or persisting unrestricted conversation history would broaden the
privacy surface and give the model facts that are not part of the normalized
property search contract.

## Decision

The browser displays a short in-memory conversation. After each successful
search, it retains the server-issued `SearchCriteria` object. A follow-up request
contains only the new question and that structured criteria object.

The server validates every field before reuse:

- country and city are fixed to Cambodia and Phnom Penh
- enums are allowlisted
- strings and numbers have explicit bounds
- invalid context returns `INVALID_SEARCH_CONTEXT`
- a new-search action discards all inherited criteria

The deterministic search engine merges only recognized conditions. The LLM, when
enabled, receives the merged criteria and the current server-selected candidate
facts. It does not receive the prior raw transcript.

## Consequences

Users can refine a search naturally without restating their full goal. The
search remains deterministic when the LLM is disabled, and candidate IDs, Trust
Scores, and source facts stay server-owned.

This is browser-session continuity, not a permanent chat history feature.
Cross-device history or member-saved searches require a separate consent,
retention, and deletion design.
