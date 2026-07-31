# ADR-0016: Evidence-backed AI search quality gate

- Status: Accepted
- Date: 2026-07-31
- Decision owner: GLI Product Owner
- Technical owner: Codex PM / Technical Lead

## Context

An OpenAI API key and model name prove only that a runtime is configured. They
do not prove that GLI's representative investment conversations still extract
the intended criteria, remain grounded in server-selected listings, preserve
Trust facts or avoid falling back after an unsafe or invalid model response.

## Decision

- Maintain a versioned five-case suite covering KRW investment budget, seasonal
  residence with short-stay intent, BKK1 rental constraints, river-view rental
  constraints and a bounded follow-up conversation.
- Evaluate criteria extraction, minimum candidate availability, asset/citation
  grounding, immutable Trust values and the requested advisor mode.
- Allow any administrator, including the shared demo operator, to execute the
  no-cost rules rehearsal. Demo runs are returned to the browser but not saved.
- Allow only a real administrator with configured server-side OpenAI settings
  to run and persist the model evaluation.
- Store suite version, requested mode, model name, pass counts, bounded case
  checks, timestamps and administrator identity in D1. Do not store customer
  conversations, model answers, IP addresses, credentials or raw prompts.
- Require a successful OpenAI run of the current suite within 30 days for the
  automated AI release gate. A later rules rehearsal does not replace or
  invalidate that OpenAI evidence.
- Keep model selection and human quality approval as explicit external pilot
  gates even when the automated suite passes.

## Consequences

- Runtime configuration can no longer make the AI release gate pass by itself.
- The public demo can show a real evaluation workflow without consuming model
  credits or claiming production AI readiness.
- Updating evaluation cases requires a suite-version change and a new model run.
- The suite is a regression and safety boundary, not a substitute for broader
  human evaluation, legal review or live-user acceptance testing.
