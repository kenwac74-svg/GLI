# Cambodia Source Policy Register

Updated: 2026-07-31

This register controls production collection. Technical accessibility is not permission to collect or republish.

## Hosted demo exception

- The hosted product simulation may set `DEMO_SOURCE_AUTO_APPROVAL=true` only
  while `DEPLOYMENT_STAGE=demo`. In that mode, configured sources and collected
  records are treated as approved and records are published immediately.
- This exception never fabricates attribution and never bypasses HTTPS, host,
  field, size, robots, privacy, or source-side access controls. A public source
  link still requires an exact collected HTTPS original-listing URL.
- Production and pilot deployments must not set this flag. They must restore
  source authorization, private review, the complete publication checklist,
  and the immutable human decision ledger described below.

| Source | Status | Current basis | MVP action |
|---|---|---|---|
| Khmer24 | AUTHORIZATION_REQUIRED | `robots.txt` currently advertises `search=yes` and `use=reference`, while reserving AI training and returning a Cloudflare 403 challenge to the server collector. No public API or partner feed was found. | The bounded reference-search connector is installed but cannot run until GLI records the permitted AI-use scope and Khmer24 allowlists the collector or provides an authorized feed. |
| Realestate.com.kh | AUTHORIZATION_REQUIRED | Published terms prohibit using or indexing content to construct or populate a searchable property database unless specifically authorized. | Do not crawl. Pursue API, feed, licence, or partnership authorization. |
| FazWaz Cambodia | AUTHORIZATION_REQUIRED | General pages are public, but the published robot policy blocks API and GraphQL paths and no public partner feed was found. | Keep disabled and request an authorized feed or API agreement. |
| CAM Realty | AUTHORIZATION_REQUIRED | Its public WordPress property API and generic crawler policy are technically compatible with a bounded reference connector. Public access is not a reuse licence. | Connector is installed but remains blocked until written reuse and AI-reference scope is recorded. |
| Cambodia Property Asia | AUTHORIZATION_REQUIRED | Its public WordPress property API permits technical access on the configured path; the connector limits records to English listing links. Public access is not a reuse licence. | Connector is installed but remains blocked until written reuse and AI-reference scope is recorded. |
| IPS Cambodia | AUTHORIZATION_REQUIRED | Published terms prohibit automated collection and creation of a searchable property database without authorization. | Do not crawl. Pursue an API, feed, licence, or partnership authorization. |

## Required controls

- `sources.approval_status` must be `APPROVED` before a production job can run.
- Store the policy URL, reviewer, approval date, permitted fields, rate limit, image rule, attribution rule, and expiry.
- Preserve source URL, external ID, collection time, and snapshot hash internally.
- Public attribution uses an allowlisted display name mapped from the approved
  source identifier. The asset detail may show that name and the exact HTTPS
  original-listing URL only when both values exist; fixtures and GLI-curated
  assets do not receive invented external links.
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
- `WORDPRESS_PROPERTY_REFERENCE_V1` reads each source's `robots.txt` before its
  public property API, accepts JSON only, and stores the exact raw response with
  a SHA-256 provenance hash before normalization.
- The WordPress reference parser accepts exact price, area, room, location,
  image, title, type, transaction, source link, and external ID fields only.
  Ranges, missing values, unsupported categories, and ambiguous locations are
  rejected rather than inferred.
- CAM Realty and Cambodia Property Asia are configured for this connector but
  remain `AUTHORIZATION_REQUIRED`. IPS, Realestate.com.kh, and FazWaz remain
  disabled until an authorized delivery channel is approved.

## Reviewed pages

- Khmer24 privacy policy: https://www.khmer24.com/privacy-policy
- Khmer24 posting rules: https://www.khmer24.com/posting-rule
- Khmer24 contact: https://www.khmer24.com/contact-us
- Realestate.com.kh terms: https://www.realestate.com.kh/legal/
- Realestate.com.kh robots: https://www.realestate.com.kh/robots.txt
- FazWaz Cambodia privacy: https://www.fazwaz-kh.com/about/privacy
- FazWaz Cambodia robots: https://www.fazwaz-kh.com/robots.txt
- CAM Realty property search: https://camrealtyservice.com/property-search/
- CAM Realty robots: https://camrealtyservice.com/robots.txt
- Cambodia Property Asia privacy: https://www.cambodiaproperty.asia/en/privacy-policy/
- Cambodia Property Asia robots: https://www.cambodiaproperty.asia/robots.txt
- IPS Cambodia terms: https://ips-cambodia.com/terms-of-service
