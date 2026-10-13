# Step8 LOCAL integrated QA

## Approved boundary
- GPT login is the developer feature-test route; Google/social sign-in is the staff experience route.
- Real ChatGPT Sites identity remains authoritative when present. LOCAL fallback creates a separate developer test identity.
- Google currently provides a LOCAL sign-in preview, not Google OAuth. No other social provider was selected or added.
- No public deployment, commit/push, paid AI dispatch or new collection.

## Implementation
- `lib/auth-preview.ts`, `/api/auth/preview`: loopback host + development stage + explicit LOCAL flag + same-origin POST; server-owned, HttpOnly, SameSite cookie, two-hour lifetime.
- Developer preview uses one test identity; staff preview uses a per-session UUID. Neither grants administrator access. Logout clears preview identity.
- MY retains profile/membership/unified favorites only; its overview query no longer loads excluded legacy consultation/notification tables.
- Existing LOCAL SQL0013 applied to restore membership usage table and consultation priority. The migration ledger has no0013 entry: schema repair is not proof that all historical migrations are reconciled. Do not blindly run all migrations.
- LOCAL DB verification: listings9/discovered56 unchanged; membership_usage_counters exists. No remote DB changed.
- Approved Mantawi fixture title localizes through both plain and fixture-prefixed IDs. External source title remains unchanged.
- Filtered counts now retain locale-aware calculation; zero results show a short existing-style empty state.

## Evidence
- `npm run check`:362 tests pass; typecheck, migration validation and build pass; lint0 errors,12 warnings.
- Actual LOCAL browser: Google staff and GPT developer previews enter different MY identities; logout returns to chooser.
- Earlier LOCAL test identity saved Mantawi and received inquiry receipt GLI-68AA942A9B984BA08508. Test data retained; no real email, assignment or booking occurred.
- Detail return preserved Philippines filter, Trust sort and scroll. Mobile menu closed after Vietnam/rent selection.
- Explore KO/EN:360/390/768/1286/1440px; no horizontal overflow. EN MY inquiry at the same five widths: no overflow; form labels translated. KO MY375px inspected.
- Consultation fetch was intercepted with synthetic responses only: new top search clears prior context; bottom follow-up retains context; failed response retains draft; retry does not duplicate failed turn. This is UI evidence, not live AI quality or speed evidence.
- Vietnam rent empty state inspected after fix. No live AI requests used for this check.

## Follow-up verification (HIST-20261013-018)
- Google LOCAL staff identity: Mantawi save -> detail reload -> MY showed1 favorite -> MY reload kept1 -> remove -> MY reload kept0. Source asset was not deleted.
- Logged-out detail inquiry -> login chooser retained fixture:GLI-PT-PH-507 -> Google login returned to the same related-asset inquiry with member identity filled. No new inquiry submitted.
- EN MY logout, watchlist heading/remove tooltip and missing-price copy were absent from the exact dictionary. Added four keys only; regression failed before the fix, then passed. KO/EN account labels and fixture title checked in browser.
- Final `npm run check`:362 tests pass, typecheck/build/migration validation pass; lint0 errors/12 warnings. No design/layout/auth policy changes.
- A second staff preview account retains one sample favorite for the final screen. The earlier test account's favorite was removed through the ordinary MY control, not through data deletion.

## Remaining
- Real ChatGPT authenticated flow, actual Google OAuth, public host and real phones remain separate checks.
- Other social providers, public staff access/security policy and administrator OAuth require approval.
- Session expiry and actual authenticated-provider behavior remain untested in browser; synthetic preview is not OAuth evidence.
- Country-wide content translation is not proven by the scoped MY label checks.
- DOM image checks do not cover every CSS background image. Source accuracy and external-media coverage remain separate.
- LOCAL preview runs at http://localhost:8780/my after the previous8776 service stopped.
