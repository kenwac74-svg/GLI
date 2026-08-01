import assert from "node:assert/strict";
import test from "node:test";

import {
  GUEST_ENTITLEMENTS,
  getMembershipEntitlements,
  getMembershipOffer,
} from "../lib/membership-plans.ts";

test("applies the finalized monthly membership prices and asset tiers", () => {
  assert.deepEqual(
    ["explore", "investor", "private"].map((planId) => {
      const offer = getMembershipOffer(planId, "monthly");
      const access = getMembershipEntitlements(planId);
      return {
        planId,
        amountKrw: offer.amountKrw,
        amountUsd: offer.amountUsd,
        tier: access.includedAssetTier,
        aiMonthlyLimit: access.aiMonthlyLimit,
      };
    }),
    [
      {
        planId: "explore",
        amountKrw: 3_000,
        amountUsd: 1.99,
        tier: "basic",
        aiMonthlyLimit: 60,
      },
      {
        planId: "investor",
        amountKrw: 4_500,
        amountUsd: 2.99,
        tier: "standard",
        aiMonthlyLimit: 150,
      },
      {
        planId: "private",
        amountKrw: 15_000,
        amountUsd: 10,
        tier: "premium",
        aiMonthlyLimit: 400,
      },
    ],
  );
});

test("applies annual discounts and keeps favorites unlimited", () => {
  assert.deepEqual(
    ["explore", "investor", "private"].map((planId) => {
      const offer = getMembershipOffer(planId, "yearly");
      return [offer.amountKrw, offer.amountUsd, offer.discountPercent];
    }),
    [
      [32_400, 21.49, 10],
      [45_900, 30.5, 15],
      [144_000, 96, 20],
    ],
  );

  assert.equal(GUEST_ENTITLEMENTS.favoriteLimit, null);
  for (const planId of ["explore", "investor", "private"]) {
    assert.equal(getMembershipEntitlements(planId).favoriteLimit, null);
  }
});
