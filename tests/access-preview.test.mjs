import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { accessPreviewTier, canPreviewTier } from "../lib/access-preview.ts";

test("preview tier accepts only the five existing tiers", () => {
  assert.equal(accessPreviewTier("basic"), 1);
  assert.equal(accessPreviewTier("business"), 4);
  assert.equal(accessPreviewTier("unknown"), null);
  assert.equal(accessPreviewTier("5"), null);
});
test("external higher-tier previews require acquired resources", () => {
  assert.equal(canPreviewTier(false, 0, 4), true);
  assert.equal(canPreviewTier(true, 0, 1), false);
  assert.equal(canPreviewTier(true, 1, 1), true);
  assert.equal(canPreviewTier(true, 0, 0), true);
});
test("external preview excludes fixture analysis and never debits a cash balance", () => {
  const source = readFileSync(new URL("../app/assets/[id]/asset-access-demo.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /setCashBalance|setUnlockedLevel/);
  assert.match(source, /!externalSource && hasAccess && selected.id === "basic"/);
  assert.match(source, /canPreviewTier\(externalSource, publicResources.length/);
});
