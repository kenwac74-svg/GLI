# Gemini discovery runtime

Gemini is a private server-side discovery adapter. The public product remains
one GLI AI and does not expose provider names, prompts, credentials, or raw
provider responses.

## Local configuration

Put these values in the ignored `.env.local` file:

```text
GEMINI_API_KEY=<server-secret>
GEMINI_MODEL=gemini-3.6-flash
GEMINI_THINKING_LEVEL=medium
GEMINI_DISCOVERY=enabled
GEMINI_ADVISOR=enabled
GEMINI_ADVISOR_MODEL=models/gemini-3.7-flash
GEMINI_ADVISOR_THINKING_LEVEL=medium
LIVE_CAMBODIA_DISCOVERY=enabled
```

Never prefix the key with `NEXT_PUBLIC_`, include it in browser JavaScript, or
commit an environment file. The local Vite/Cloudflare binding passes the value
only to the Worker runtime.

## Production configuration

Create `GEMINI_API_KEY` as an encrypted server secret in the hosting project.
The model and feature switches may be ordinary server environment variables.
After deployment, search the generated client assets for the key prefix and
confirm that `/api/search` returns no provider error body or credential text.

## GLI validation boundary

The model may discover and structure candidates, but it cannot publish or mark
an asset as GLI verified. The server accepts only:

- Cambodia results while Cambodia is the connected pilot country;
- direct HTTPS listing pages from Khmer24, CAM Realty, or Cambodia Property Asia;
- the requested city, transaction, property type, bedroom count, and USD budget;
- bounded text, numbers, currencies, and public URLs that pass deterministic
  validation.

Accepted web candidates are `PRELIMINARY` and retain the original source link.
If Gemini times out, returns invalid JSON, or finds nothing, the existing source
collectors and snapshots remain available.

## Conversational advisor

Gemini 3.7 Flash receives only the server-parsed criteria, the bounded recent
conversation, the current exchange-rate record and the server-selected asset
candidates. It returns a structured answer, one optional clarification, selected
candidate IDs and grounded reasons. Candidate IDs, prices and Trust data remain
server-owned and cannot be replaced by the model.

The advisor uses the Interactions API with medium thinking, no external tools,
no stored interaction and a 1,400-token output cap. The browser never receives
the provider name, API key, system instruction or raw provider response. A
timeout, invalid schema, unknown asset ID or unsupported assurance falls back to
the deterministic GLI response.

## Cost and latency controls

- Identical query and criteria combinations are cached for ten minutes.
- One request returns at most ten candidates by default.
- Structured source collectors run first. Gemini expansion runs only when they
  provide fewer than six matching results, avoiding unnecessary latency and
  grounded-search charges.
- The server timeout is 30 seconds because grounded discovery can take longer
  than an ordinary model-only response.
- Search grounding uses Gemini 3.6 Flash with medium thinking by default.
- Google Search grounding can issue multiple billable searches in one model
  request, so production should add per-member quotas and daily budget alerts.
- Conversational synthesis uses Gemini 3.7 Flash only after server-side
  filtering. Local development permits anonymous preview; production keeps the
  existing membership entitlement and usage-claim checks.

## Live implementation note

The current demo treats validated source-backed candidates as displayable after
automated checks. The live product must persist raw evidence, run the configured
review workflow, and require administrator publication approval before public
release.
