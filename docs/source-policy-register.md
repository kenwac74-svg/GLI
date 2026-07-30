# Cambodia Source Policy Register

Updated: 2026-07-30

Technical accessibility is not permission to collect or republish.

| Source | Status | Current basis | MVP action |
|---|---|---|---|
| Khmer24 | PENDING_WRITTEN_APPROVAL | Public listing pages and posting/privacy policies are available, but an explicit aggregation licence was not found in the reviewed public policies. | Use anonymized fixtures and a disabled connector. Request written permission before recurring production collection. |
| Realestate.com.kh | AUTHORIZATION_REQUIRED | Published terms prohibit using or indexing content to construct or populate a searchable property database unless specifically authorized. | Do not crawl. Pursue an API, feed, licence, or partnership. |
| FazWaz Cambodia | PENDING_REVIEW | Public access alone is insufficient; applicable terms and feed options require review. | Do not enable production collection until review is complete. |

## Required controls

- A source must be `APPROVED` before a production job can run.
- Store policy URL, reviewer, approval date, permitted fields, rate limit, image rule, attribution rule, and expiry.
- Preserve source URL, external ID, collection time, and snapshot hash internally.
- Remove or mask personal contact data unless the approved business purpose requires it.
- A source policy change pauses the connector until re-approved.

## Reviewed pages

- https://www.khmer24.com/privacy-policy
- https://www.khmer24.com/posting-rule
- https://www.khmer24.com/contact-us
- https://www.realestate.com.kh/legal/
- https://www.realestate.com.kh/robots.txt
