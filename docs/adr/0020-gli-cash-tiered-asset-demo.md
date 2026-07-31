# ADR 0020: GLI Cash and tiered asset-detail demo boundary

Date: 2026-07-31

## Status

Accepted for the Web2 demonstrator.

## Context

GLI needs an asset-detail experience that demonstrates five progressively richer
information and service levels: Free, Basic, Standard, Premium, and Business.
The reference interface was originally designed around GLIB staking, wallet
connection, yield rewards, and future Web3 functions. Those blockchain functions
are outside the current Web2 phase.

GLI Cash is instead a prepaid platform balance. It is intended to support
asset-level access, travel-product purchases, and future convenience services
across GLI. A future token rail may coexist with GLI Cash, but must not replace or
silently mutate the Web2 cash ledger or entitlement rules.

## Decision

1. The Web2 demo uses `GLI Cash`, never GLIB, staking, yield rewards, wallet
   connection, DAO, or on-chain language.
2. Free content is available to registered members. Basic is represented as a
   `$1.99` monthly platform subscription. Standard is represented as a `$2.99`
   monthly platform subscription, with a `$1.00` same-period Basic upgrade in the
   demonstrative flow.
3. Premium and Business are asset-specific access tiers represented as GLI Cash
   purchases.
4. Unlocking a higher level automatically unlocks every lower level for the same
   asset.
5. GLI Cash is modeled as non-transferable prepaid platform value. It has no
   interest, staking reward, withdrawal, governance, or investment-return claim.
6. The current purchase interaction is local UI simulation only. It does not
   charge a card, call a PG provider, create a durable cash ledger, or grant a
   production entitlement.
7. Category-specific metrics may replace universal APY and yield fields. Property,
   leisure, commercial, and non-property projects will require separate approved
   content schemas.

## Demonstrator limitation

All numbers, document names, risk indicators, GLI Cash prices, verification
progress, service packages, and access descriptions shown in the asset-detail
demo are illustrative placeholders. They are not an approved commercial price
list, service promise, investment analysis, verified fact, or final entitlement
matrix.

Production implementation requires separate approval for:

- category and subtype content schemas;
- the exact Free/Basic/Standard/Premium/Business information matrix;
- GLI Cash denomination, recharge, expiry, refund, cancellation, and accounting;
- durable balance and transaction ledgers;
- asset-pass duration and content-update rights;
- Business service scope, operator capacity, SLA, and acceptance flow;
- consumer disclosures, tax, payment, privacy, and jurisdictional review;
- coexistence rules for any later token payment rail.

## Consequences

The demo can show the intended completed experience without implying that
blockchain settlement or production billing exists. Future implementation must
reuse the entitlement boundary, but must not treat the placeholder UI content as
an engineering or commercial source of truth.
