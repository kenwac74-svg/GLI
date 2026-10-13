import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PAYMENT_PREVIEW_METHODS } from "../lib/payment-preview.ts";
test("payment preview includes the four approved methods only", () => {
  assert.deepEqual(PAYMENT_PREVIEW_METHODS, ["네이버페이", "카카오페이", "토스페이", "신용카드"]);
});
test("checkout action opens a chooser instead of activating membership", () => {
  const shell=readFileSync(new URL("../app/components/claude-design-shell.tsx",import.meta.url),"utf8");
  assert.match(shell,/case "activate": setPaymentPreviewOpen\(true\); break;/);
  const dialog=readFileSync(new URL("../app/components/payment-preview-dialog.tsx",import.meta.url),"utf8");
  assert.doesNotMatch(dialog,/fetch\(|window.location|cardNumber|setPaid/);
  assert.match(dialog,/type="radio"/);
});
