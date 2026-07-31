import assert from "node:assert/strict";
import test from "node:test";

import {
  SOURCE_APPROVAL_STATUSES,
  SourcePolicyError,
  assertSourceCollectionAllowed,
  runApprovedSourceConnector,
} from "../ingestion/source-policy.ts";

const NOW = new Date("2026-07-30T12:00:00.000Z");

function policy(overrides = {}) {
  return {
    sourceSlug: "partner-feed",
    approvalStatus: "APPROVED",
    permittedFields: ["externalId", "title", "price"],
    approvalExpiresAt: "2026-08-30T12:00:00.000Z",
    robotsAllowed: false,
    ...overrides,
  };
}

function connector(overrides = {}) {
  return {
    sourceSlug: "partner-feed",
    requestedFields: ["externalId", "title"],
    collect: async () => ({ collected: true }),
    ...overrides,
  };
}

test("supports the complete source approval status contract", () => {
  assert.deepEqual(SOURCE_APPROVAL_STATUSES, [
    "PENDING",
    "AUTHORIZATION_REQUIRED",
    "APPROVED",
    "SUSPENDED",
    "EXPIRED",
  ]);
});

test("runs only an approved, unexpired connector whose fields are permitted", async () => {
  let calls = 0;
  const result = await runApprovedSourceConnector(
    connector({
      collect: async () => {
        calls += 1;
        return { collected: true };
      },
    }),
    policy(),
    NOW,
  );

  assert.deepEqual(result, { collected: true });
  assert.equal(calls, 1);
});

test("allows an approved policy with no fixed expiry", () => {
  assert.doesNotThrow(() =>
    assertSourceCollectionAllowed(
      connector(),
      policy({ approvalExpiresAt: null }),
      NOW,
    ),
  );
});

for (const approvalStatus of [
  "PENDING",
  "AUTHORIZATION_REQUIRED",
  "SUSPENDED",
  "EXPIRED",
]) {
  test(`blocks ${approvalStatus} even when robots.txt allows crawling`, async () => {
    let collected = false;

    await assert.rejects(
      runApprovedSourceConnector(
        connector({
          collect: async () => {
            collected = true;
          },
        }),
        policy({ approvalStatus, robotsAllowed: true }),
        NOW,
      ),
      (error) => {
        assert.ok(error instanceof SourcePolicyError);
        assert.equal(error.sourceSlug, "partner-feed");
        assert.equal(error.reason, "NOT_APPROVED");
        assert.equal("publicLabel" in error, false);
        return true;
      },
    );
    assert.equal(collected, false);
  });
}

test("treats an approval expiring at the current instant as expired", () => {
  assert.throws(
    () =>
      assertSourceCollectionAllowed(
        connector(),
        policy({ approvalExpiresAt: NOW.toISOString() }),
        NOW,
      ),
    (error) => {
      assert.ok(error instanceof SourcePolicyError);
      assert.equal(error.sourceSlug, "partner-feed");
      assert.equal(error.reason, "APPROVAL_EXPIRED");
      return true;
    },
  );
});

test("blocks when any requested field is outside permittedFields", async () => {
  let collected = false;

  await assert.rejects(
    runApprovedSourceConnector(
      connector({
        requestedFields: ["externalId", "sellerPhone"],
        collect: async () => {
          collected = true;
        },
      }),
      policy(),
      NOW,
    ),
    (error) => {
      assert.ok(error instanceof SourcePolicyError);
      assert.equal(error.sourceSlug, "partner-feed");
      assert.equal(error.reason, "FIELD_NOT_PERMITTED");
      assert.match(error.message, /sellerPhone/);
      assert.equal("publicLabel" in error, false);
      return true;
    },
  );
  assert.equal(collected, false);
});

test("blocks a connector from borrowing another source policy", () => {
  assert.throws(
    () =>
      assertSourceCollectionAllowed(
        connector({ sourceSlug: "unapproved-source" }),
        policy(),
        NOW,
      ),
    (error) => {
      assert.ok(error instanceof SourcePolicyError);
      assert.equal(error.sourceSlug, "unapproved-source");
      assert.equal(error.reason, "SOURCE_MISMATCH");
      return true;
    },
  );
});

test("enforces the approved connector kind and exact HTTPS host", () => {
  assert.doesNotThrow(() =>
    assertSourceCollectionAllowed(
      connector({
        connectorKind: "LICENSED_JSON_V1",
        endpoint: "https://feeds.partner.example/listings.json",
      }),
      policy({
        connectorKind: "LICENSED_JSON_V1",
        allowedHosts: ["feeds.partner.example"],
      }),
      NOW,
    ),
  );

  assert.throws(
    () =>
      assertSourceCollectionAllowed(
        connector({
          connectorKind: "HTML_CRAWLER",
          endpoint: "https://feeds.partner.example/listings.json",
        }),
        policy({
          connectorKind: "LICENSED_JSON_V1",
          allowedHosts: ["feeds.partner.example"],
        }),
        NOW,
      ),
    (error) => {
      assert.ok(error instanceof SourcePolicyError);
      assert.equal(error.reason, "CONNECTOR_KIND_NOT_PERMITTED");
      return true;
    },
  );

  assert.throws(
    () =>
      assertSourceCollectionAllowed(
        connector({
          connectorKind: "LICENSED_JSON_V1",
          endpoint: "https://unapproved.example/listings.json",
        }),
        policy({
          connectorKind: "LICENSED_JSON_V1",
          allowedHosts: ["feeds.partner.example"],
        }),
        NOW,
      ),
    (error) => {
      assert.ok(error instanceof SourcePolicyError);
      assert.equal(error.reason, "ENDPOINT_NOT_PERMITTED");
      return true;
    },
  );
});

test("rejects malformed policy inputs before collection", async () => {
  await assert.rejects(
    runApprovedSourceConnector(
      connector(),
      policy({ approvalExpiresAt: "not-a-date" }),
      NOW,
    ),
    /approvalExpiresAt must be a valid date-time/,
  );

  await assert.rejects(
    runApprovedSourceConnector(
      connector({ requestedFields: ["title", "title"] }),
      policy(),
      NOW,
    ),
    /must not contain duplicate fields/,
  );

  await assert.rejects(
    runApprovedSourceConnector(
      connector(),
      policy({ maxRecordsPerRun: 0 }),
      NOW,
    ),
    /maxRecordsPerRun must be an integer/,
  );
});
