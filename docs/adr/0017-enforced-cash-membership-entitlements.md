# ADR 0017: Enforced cash-membership entitlements

Status: Accepted

Date: 2026-07-31

## Context

The Web2 MVP describes cash membership as a global platform subscription, while
future GLIB staking is a separate, asset-specific subscription for selected GLI
Direct opportunities. Cash-plan benefits were visible in the product, but only
full Trust Report access had a complete server-side authorization boundary.

## Decision

Cash membership benefits are resolved from one server-side entitlement policy:

- no active cash plan: five favorites, rules search, standard consultation;
- Explore: twenty favorites, sixty grounded deep-AI searches per UTC month,
  basic Trust content, and standard consultation;
- Investor: unlimited favorites and deep-AI searches, full Trust Report, and
  priority consultation;
- Private: Investor access plus private consultation priority.

Anonymous search remains available in deterministic rules mode. OpenAI is never
called for anonymous or unpaid traffic. Explore usage is claimed atomically only
when the OpenAI runtime is configured and is restored when the advisor falls
back to rules. The server stores only a monthly counter, not raw conversation
history. Consultation priority is captured when a request is submitted and is
used to order the operations queue.

## Consequences

- Advertised limits and API authorization now share the same plan definitions.
- Public discovery remains usable without creating variable model cost.
- A model outage does not consume a paid search allowance.
- Existing consultations keep their submission-time service priority.
- GLIB rewards and asset-specific staking remain outside this Web2 boundary.
