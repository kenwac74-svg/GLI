# Cambodia Source Policy Register

Updated: 2026-07-31

This register controls production collection. Technical accessibility is not permission to collect or republish.

| Source | Status | Current basis | MVP action |
|---|---|---|---|
| Khmer24 | AUTHORIZATION_REQUIRED | `robots.txt` currently advertises `search=yes` and `use=reference`, while reserving AI training and returning a Cloudflare 403 challenge to the server collector. No public API or partner feed was found. | The bounded reference-search connector is installed but cannot run until GLI records the permitted AI-use scope and Khmer24 allowlists the collector or provides an authorized feed. |
| Realestate.com.kh | AUTHORIZATION_REQUIRED | Published terms prohibit using or indexing content to construct or populate a searchable property database unless specifically authorized. | Do not crawl. Pursue API, feed, licence, or partnership authorization. |
| FazWaz Cambodia | PENDING_REVIEW | Public access alone is insufficient; applicable terms and feed options require review. | Do not enable production collection until review is complete. |

## Required controls

- `sources.approval_status` must be `APPROVED` before a production job can run.
- Store the policy URL, reviewer, approval date, permitted fields, rate limit, image rule, attribution rule, and expiry.
- Preserve source URL, external ID, collection time, and snapshot hash internally.
- Remove or mask seller phone numbers and other personal data unless the approved business purpose requires them.
- A source policy change automatically pauses the connector until re-approved.

## Implemented connector boundary

- `LICENSED_JSON_V1` accepts only the versioned GLI partner-feed envelope.
- The source record controls connector kind, exact allowed hosts, permitted
  fields, and maximum records per run.
- Redirects, non-HTTPS endpoints, credentials in URLs, unsupported content
  types, oversized responses, and mismatched source identifiers are rejected.
- The raw response is written to the raw-object store before normalization; D1
  stores its object key and SHA-256 provenance hashes.
- Partner credentials are resolved from worker secrets. They are not stored in
  source configuration or audit logs.
- Credential references must use the `SOURCE_SECRET_*` naming convention.
- Source approval records are saved only by a real active administrator. The
  shared demo administrator can preview validation but cannot mutate policy.
- Approving a licensed feed records its written approval reference, review
  timestamp, approving administrator, optional expiry, exact feed host,
  permitted standard fields, and record limit.
- Suspending a source immediately changes its policy to `SUSPENDED` while
  preserving the connection record and audit history.
- Khmer24 is configured as `KHMER24_REFERENCE_SEARCH_V1` but remains
  `AUTHORIZATION_REQUIRED`; Realestate.com.kh and FazWaz remain `DISABLED`.
- The Khmer24 connector reads `robots.txt` on every run, requires
  `search=yes,use=reference`, rejects disallowed paths, and stops on HTTP 403 or
  429 without attempting to bypass source-side controls.
- The Khmer24 parser keeps only reference-search fields and excludes seller
  profiles, phone numbers, chats, and account-area data. Incomplete or currently
  unsupported land/commercial cards are rejected instead of guessed.

## Reviewed pages

- Khmer24 privacy policy: https://www.khmer24.com/privacy-policy
- Khmer24 posting rules: https://www.khmer24.com/posting-rule
- Khmer24 contact: https://www.khmer24.com/contact-us
- Realestate.com.kh terms: https://www.realestate.com.kh/legal/
- Realestate.com.kh robots: https://www.realestate.com.kh/robots.txt
