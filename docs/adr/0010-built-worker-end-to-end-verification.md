# ADR 0010: Built-Worker End-to-End Verification

Status: Accepted

Date: 2026-07-31

## Context

Domain unit tests proved individual workflows, while the deployment smoke test
covered only the public shell and search API. That evidence did not prove that
authentication, D1 access, member mutations, cash membership, administrator
authorization, and readiness pages remained connected after the vinext build.

The production worker obtains D1 through the `cloudflare:workers` runtime
module. Node does not implement that module when the built worker is imported
directly.

## Decision

- Test the generated `dist/server/index.js`, not a duplicate HTTP application.
- Apply every committed D1 migration to an isolated in-memory SQLite database.
- Expose that database through a D1-compatible adapter.
- Resolve `cloudflare:workers` to a test-only environment shim through a Node
  module loader registered by the test command.
- Keep the application runtime code unchanged and keep all shims under
  `tests/support`.
- Cover one complete member journey and one administrator authority/evidence
  journey.
- Run these tests inside the standard `npm test` and GitHub CI gate.

## Consequences

The build can no longer pass CI when member or administrator routes compile but
fail to reach their runtime bindings. Migration drift, authorization regressions,
workflow disconnections, and rendered-page regressions are caught against the
deployable artifact.

The adapter is a compatibility verifier, not a replacement for Cloudflare D1
staging tests. Production bindings and provider credentials still require
environment-specific validation.
