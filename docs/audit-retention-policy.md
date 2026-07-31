# GLI Audit Retention Policy

Status: Pilot baseline

Owner: GLI Operations

Review cycle: Quarterly and before production launch

## Scope

This policy covers application audit events for member actions, asset review,
collection, source approval, consultations, cash membership, and operations.
It does not replace payment-provider, infrastructure, or legal records.

## Pilot Rules

- Keep application audit events for at least 365 days in production.
- Do not expose audit history or exports to non-administrator accounts.
- Keep events append-only in normal application workflows.
- Export only the most recent 30 days per request and cap one export at 1,000
  rows.
- Redact credentials and authorization material before rendering or export.
- Treat CSV exports as confidential operational records.
- Store production exports only in an approved access-controlled location.
- Record a verified backup before any approved retention deletion.

## Deletion Gate

Automated deletion remains disabled during the MVP. A production deletion job
requires written approval from the GLI Product Owner, Legal, and Security. The
approved procedure must define the legal hold check, backup evidence, deletion
batch size, operator, and verification report.

## Incident Use

When an incident is suspected, preserve the affected period, suspend scheduled
deletion, export the relevant category, and record the investigation reference
outside the application database.

## Production Follow-up

- Select the immutable backup destination and encryption owner.
- Approve the legal retention period by country and record type.
- Add restoration drills and evidence capture.
- Add cursor-based export jobs if operational volume exceeds the synchronous
  1,000-row boundary.

