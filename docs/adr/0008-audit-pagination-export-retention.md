# ADR 0008: Audit Pagination, Export, and Retention Boundary

Status: Accepted

Date: 2026-07-31

## Context

The first audit center displayed only a fixed recent set. Pilot operations need
stable navigation as records grow and a portable review artifact, while exports
must not bypass the viewer's authorization and redaction controls.

## Decision

- Use descending `(created_at, id)` cursor pagination instead of offsets.
- Add indexes for time-ordered and action-filtered audit queries.
- Keep page cursors validated and use bound values in SQL.
- Provide administrator-only CSV export for the selected category.
- Export at most the most recent 30 days and 1,000 events synchronously.
- Apply the same recursive redaction used by the audit screen before export.
- Escape every CSV cell and neutralize spreadsheet formula prefixes.
- Mark responses `no-store`, force attachment download, and disable MIME
  sniffing.
- Keep automatic retention deletion disabled during the MVP.

## Consequences

Audit navigation remains stable when newer events arrive, and spreadsheet review
does not require direct database access. Large historical exports, immutable
archive storage, country-specific retention, and verified deletion remain
production governance work.

