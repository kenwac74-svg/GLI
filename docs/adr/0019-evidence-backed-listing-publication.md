# ADR 0019: Evidence-backed listing publication

## Status

Accepted on 2026-07-31.

## Context

The ingestion workflow kept new listings private and required an administrator
to publish them. The former action recorded who clicked publish but did not
prove which source, factual, privacy, and limitation checks were completed or
why the reviewer made the decision.

Trust approval must be attributable without exposing internal analyst notes in
general-purpose audit exports.

## Decision

Every publish decision requires:

1. confirmation that the source rights and approved scope were checked;
2. confirmation that price, location, area, and room facts were cross-checked;
3. confirmation that public copy contains no contact or non-public data;
4. confirmation that limitations and next actions are recorded; and
5. a normalized analyst note between 20 and 1,000 characters.

Hold decisions also require a note but may leave checklist items incomplete.
The listing status, Trust approval, and immutable review-decision row are written
as one D1 batch where the runtime supports it. A duplicate transition to the
current state is rejected.

The full note is stored in `listing_review_decisions` and shown only in the
administrator due-diligence page. The general audit event stores the checklist
and note length, not the note body.

## Consequences

Publication has an inspectable human decision trail and cannot be performed
through the API with an incomplete checklist. GLI operations must assign active
administrators as named reviewers before a live pilot. Existing fixture assets
remain usable, but their historical approvals do not gain invented decision
records.
