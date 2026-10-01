# SNS Discovery Review - 2026-10-01

Status: proposal only; no SNS connector, account, source approval or product change.

## Delegated discussion

- User authorised reading the existing Mini/Gemini GLI conversation and
  discussing SNS intake. Existing chat: https://gemini.google.com/app/4eef3ca59310ee40
- The latest mounted prior turn discussed browser automation detection. Its
  categorical detection/cost claims were not independently established here.
- Two discussion prompts were sent: a bounded comparison, then a simpler
  broker-submission question. Both completed with generic inability responses.
  No substantive recommendation or joint agreement was obtained. Cause unknown;
  no third retry, new chat, model change or restriction bypass was attempted.
- Screenshot: `work/qa/mini-sns-review-20261001.jpg`.

## Independently verified capabilities

- Telegram bots receive private submissions and messages from channels where
  they are members. Group privacy/permissions affect visibility. This is not
  arbitrary public-group collection or historical channel archive access.
  Source: https://core.telegram.org/bots/faq
- Telegram provides polling or webhooks, update IDs and a webhook secret header.
  Unreceived updates are retained no longer than 24 hours. Ordinary channel
  deletion does not have a general deletion-update guarantee; business-message
  deletion events must not be treated as covering all channels.
  Source: https://core.telegram.org/bots/api
- LINE Messaging API sends incoming messages to an official account's webhook;
  signature verification and asynchronous processing are recommended. Account,
  permissions and runtime still need setup; no broad SNS crawler is implied.
  Source: https://developers.line.biz/en/docs/messaging-api/receiving-messages/
- Meta official documentation fetch returned 429; current Facebook/Instagram
  access scope was not verified. Zalo collection was not verified. Hold them.

## Proposed sequence, subject to approval

1. Pilot structured form/CSV intake with one or two consenting partner brokers.
2. If those brokers already use Telegram, accept their voluntary bot submissions.
3. Only then consider new posts from explicitly authorised broker-owned channels.

Proposed pipeline: permission/use scope -> source record ID + content hash ->
changed-only AI extraction/translation -> normalized tags -> contact redaction ->
human review -> database -> expiry/status reconfirmation. Use durable storage,
idempotency and async queue rather than crawling during public search requests.

## Data and cost boundaries

- Deterministic same-source dedup needs no AI. Cross-broker possible same-unit
  matches require review; do not merge solely on an LLM verdict.
- Preserve provenance, collected time, original currency, transaction type and
  unknown completion status. Photo/OCR prices may be deposits or installments,
  not full sale prices or monthly rent. Review ambiguous values before posting.
- Listings are not lease-contract or net-income evidence; no automatic Trust
  Grade promotion. Deleted posts are not proof of sale. Use explicit sold/leased
  status submission, configurable expiry and broker reconfirmation.
- Consented intake improves access stability but requires broker onboarding and
  review. OCR, translation, storage and review still cost resources. No measured
  speed, accuracy, savings or recurring collection coverage is claimed yet.
- Needed from user: willing brokers, their existing messaging app, representative
  authorised samples, and permission scope for processing/images/public display.
- Product/API/data contracts, keys, paid APIs, build, commit, push and deployment
  are unchanged. This proposal is not an approved new source policy.
