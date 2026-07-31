# ADR-0005: Scheduled operations and alert delivery

- Status: Accepted
- Date: 2026-07-31
- Decision owner: GLI Product Owner
- Technical owner: Codex PM / Technical Lead

## Context

The public web application must not perform crawling or background retries.
Operations also need timely notification of new critical and warning
conditions without receiving the same unchanged alert on every schedule.

## Decision

- A separate scheduled-only Cloudflare Worker runs retry processing, the health
  scan, and notification delivery.
- Each schedule processes a bounded number of retries before scanning health.
- A recovered ingestion run is excluded from the active failed-run alert set.
- Notification delivery uses a versioned, provider-neutral JSON envelope.
- A notification is pending only when an alert occurrence has not been
  delivered. Re-scanning an unchanged condition does not increment its
  occurrence.
- Material severity, title, or detail changes create a new notification
  occurrence.
- The webhook must use HTTPS and an exact host from the configured allowlist.
- Failed delivery does not mark an occurrence as delivered.
- Connector credentials are exposed to the worker only through
  `SOURCE_SECRET_*` environment secrets.
- The operations actor must be an active administrator so scans and deliveries
  remain auditable.

## Consequences

- The alert provider can change without changing the health ledger.
- Repeated schedules do not create alert spam for unchanged conditions.
- A production D1 binding, R2 binding, administrator identity, cron deployment,
  alert destination, and secrets must be approved and provisioned before pilot
  activation.
