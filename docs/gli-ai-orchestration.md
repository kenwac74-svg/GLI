# GLI AI orchestration

## Current prototype behavior

The public product presents one GLI AI identity. It does not expose model or
provider names. The search API returns a public four-stage plan:

1. Request understanding
2. Candidate discovery
3. Evidence review when the question requires it
4. Answer synthesis

The current prototype uses deterministic planning, existing GLI search rules,
Cambodia source discovery and the optional single OpenAI advisor already
supported by the application. The progress UI must not be interpreted as proof
that three external model APIs were called.

## Live implementation boundary

Before launch, implement the private server-side connector layer with these
replaceable roles:

- Router/advisor connector: intent, depth, delegation and final synthesis
- Discovery connector: broad source search and structured candidate extraction
- Review connector: financial, document, evidence and risk review

Provider names, API keys, raw prompts, intermediate model reasoning and routing
decisions must remain server-side. The browser receives only the sanitized GLI
stage labels and the final grounded answer.

Consumer Pro subscriptions do not provide production API credentials or API
quota. Each provider requires a separate developer account, API key, billing,
rate-limit handling and data-processing review.

## Required controls before enabling multiple providers

- A canonical conversation state shared by all roles
- Strict JSON schemas between roles
- Per-request timeout, retry, fallback and cost limits
- Source URL and claim-level evidence retention
- Prompt-injection isolation for crawled pages
- Provider version pinning and regression evaluations
- Admin visibility into latency, cost and provider failures
- Human review for legal, tax, title and transaction conclusions

