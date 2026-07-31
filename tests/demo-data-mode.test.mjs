import assert from "node:assert/strict";
import test from "node:test";

import { isDemoSourceAutoApprovalEnabled } from "../lib/demo-data-mode.ts";

test("enables source auto-approval only for the explicit demo stage", () => {
  assert.equal(
    isDemoSourceAutoApprovalEnabled({
      DEPLOYMENT_STAGE: "demo",
      DEMO_SOURCE_AUTO_APPROVAL: "true",
    }),
    true,
  );
  assert.equal(
    isDemoSourceAutoApprovalEnabled({
      DEPLOYMENT_STAGE: "production",
      DEMO_SOURCE_AUTO_APPROVAL: "true",
    }),
    false,
  );
  assert.equal(
    isDemoSourceAutoApprovalEnabled({ DEPLOYMENT_STAGE: "demo" }),
    false,
  );
});
