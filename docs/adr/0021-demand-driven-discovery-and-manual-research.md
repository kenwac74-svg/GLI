# ADR 0021: Demand-driven discovery and manual research workflow

Date: 2026-08-01

## Status

Accepted as the target product workflow. Not yet implemented unless an item is
explicitly marked otherwise in the delivery board.

## Current phase

The current priority is the end-user prototype's UI, visual consistency,
readability, responsive behavior, and navigation. Live collection, durable
on-demand discovery, synchronization, and the staff research queue remain later
implementation work. Product decisions in this ADR must be preserved while the
UI is refined and must not be represented as completed functionality.

## Asset taxonomy

GLI is a global investment-opportunity platform whose primary inventory is real
estate; it is not a Cambodia-only property portal. The top-level end-user asset
categories are:

1. `Residential` (`주거용`): apartments, condominiums, villas, houses, and other
   residential property.
2. `Commercial` (`상업용`): offices, retail, hospitality, income-producing
   buildings, land used for commercial purposes, and related property.
3. `Leisure` (`레저`): resorts, golf, tourism, entertainment, hospitality, and
   lifestyle-oriented investment assets.
4. `Project` (`프로젝트`): GLI-originated non-property business opportunities
   and selected development or operating projects.

Country and top-level asset category are independent filters. Cambodia is the
first functional test market; Vietnam, the Philippines, and further countries
are later source expansions. `Project` inventory is curated by GLI rather than
obtained through automated portal crawling. GLI may also publish directly
researched or recommended property in any property category, visibly distinct
from externally collected market posts.

The four-category navigation, representative demo inventory, and category-aware
detail forms are part of UI refinement but are not implemented in the current
prototype as of this ADR date. Each category will need its own relevant field
matrix while retaining the common asset, source, access-tier, interest, and
consultation flows.

## Source scope and search order

Automated discovery is limited to three source groups:

1. GLI-direct, licensed partner, and small high-confidence professional sources.
2. Professional property portals and agencies with structured search surfaces.
3. Large classified sources such as Khmer24 that have broader coverage but may
   take longer or be less complete.

Social media and community channels are excluded from automated discovery. GLI
staff may research those channels manually. Source reliability remains an
internal ordering signal and is not shown to end users.

The first search queries the fastest appropriate high-confidence sources and
streams suitable candidates as they arrive. When those sources do not produce
enough suitable candidates, the next group starts automatically. When the
initial result is sufficient, the user may choose `전체 시장 더 탐색` to include
the broader, slower group.

## Demand-driven persistence

GLI does not pre-collect an entire national property market for the initial
release. A user's first search performs bounded live discovery and clearly shows
progress. Listings discovered by at least one real search are stored. A later
matching search may show the stored candidate immediately while rechecking the
original post.

Rechecking verifies that the original post still exists and reads its current
published or modified timestamp when available. The public product shows the
current source state only. It does not calculate or present a field-by-field
change history. GLI stores `source_posted_at` or `source_modified_at` separately
from `last_checked_at`; a source posting date must not be presented as a GLI
verification date.

## No cross-source deduplication

Each source post is an independent aggregator result. Similar addresses,
photos, prices, or descriptions across different sources are not automatically
merged, suppressed, or labeled as duplicates. Different posts may legitimately
offer different commercial terms. GLI staff may organize related posts later.

Same-source idempotency remains required so that collecting the exact same
source post again updates that source record instead of creating unlimited
technical copies. This is not cross-source property deduplication.

## Source-specific fields

Khmer24, CAM Realty, Cambodia Property Asia, and future sources have distinct
field structures. Each connector keeps its own extraction map and writes into a
GLI property form whose fields are nullable and carry a field-level acquisition
status. The system must not infer or invent a value that the source did not
provide.

Public field states are:

- source value available: show the current value;
- source does not provide the field: `조사 예정`;
- collection failed for the field: `확인 중`;
- field does not apply to the asset: `해당 없음`;
- GLI staff confirmed the field: show the value and GLI confirmation date;
- an attempted investigation could not verify it: `확인되지 않음`.

The original source name, direct source-post link, source timestamp, and GLI
last-checked timestamp remain visible for externally collected listings.

## Interest and staff research

Saving a listing as an interested asset creates a staff research-queue item and
a missing-field checklist. Queue priority may consider membership, stated
purchase intent, number of interested users, and information gaps. Staff findings
must record evidence and confirmation time without overwriting source provenance.

The future administrator states are `new interest`, `queued`, `researching`,
`partially confirmed`, `completed`, `unable to confirm`, and `source ended`.

## Source-age presentation

The source posting date uses compact status badges rather than changing the date
text color:

- seven days or less: green `신규` badge;
- eight days to less than three months: dark-blue `최신` badge;
- three months to less than one year: no age badge;
- one year or more: red `1년 경과` badge;
- unavailable source date: neutral `작성일 미확인` badge.

The badge describes age only. It is not a source-reliability, listing-quality,
or GLI-verification score.

## UI typography policy

Public reading surfaces use 14px as the ordinary minimum. A 12px size is reserved
for constrained badges, tier markers, disclosure copy, and footer-like secondary
information. Asset-detail left and right panels use the same body, label, and
button scale. The implemented asset-card action is named `상세 정보 확인`.

## Consequences

This model prioritizes useful, user-requested inventory over indiscriminate data
volume. External listings are discovery records; GLI staff research turns an
interested listing into progressively more complete decision-support material.
The current prototype may simulate the final appearance, but it must not claim
that live collection, synchronization, or staff investigation is already active.
