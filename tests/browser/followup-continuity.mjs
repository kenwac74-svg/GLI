// Run against a local app only. All search requests are intercepted; no AI spend.
// node tests/browser/followup-continuity.mjs <playwright-package-directory>
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(path.join(process.argv[2] || process.cwd(), "package.json"));
const { chromium } = require("playwright");
const browser = await chromium.launch({ headless: true, channel: "msedge" });
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const requests = [];
    await page.route("**/api/search", async (route) => {
      requests.push(route.request().postDataJSON());
      await new Promise(resolve => setTimeout(resolve, 250));
      if (requests.length === 3) {
        await route.fulfill({ status: 503, json: { error: "Test failure" } });
        return;
      }
      await route.fulfill({ json: {
        answer: `Test answer ${requests.length}. ` + "Verified fixture context. ".repeat(35),
        clarification: null, criteria: { country: "KH" }, matches: [],
      } });
    });
    await page.goto("http://127.0.0.1:8776/explore");
    await page.locator("[data-consult] .kicker").waitFor();
    await page.locator("#q").fill("Find a rental in Phnom Penh");
    await page.locator("[data-action='runSearch']").click();
    const input = page.locator("[data-followup-input]");
    await input.waitFor({ state: "visible" });
    await page.waitForTimeout(700);
    await input.scrollIntoViewIfNeeded();
    await input.click();
    await page.evaluate(() => {
      window.__originalComposer = document.querySelector("[data-followup-input]");
      window.__originalAnswer = document.querySelector("[data-runtime-turn$='-answer']");
    });
    const beforeY = await page.evaluate(() => scrollY);
    await input.pressSequentially("Keep the same city", { delay: 35 });
    assert.equal(await input.inputValue(), "Keep the same city", `typing ${width}`);
    assert.equal(await input.evaluate(el => el === document.activeElement), true, `focus ${width}`);
    assert.equal(await page.evaluate(() => window.__originalComposer === document.querySelector("[data-followup-input]")), true, `node identity ${width}`);
    assert.equal(await page.evaluate(() => window.__originalAnswer === document.querySelector("[data-runtime-turn$='-answer']")), true, `answer identity ${width}`);
    assert.ok(Math.abs(await page.evaluate(() => scrollY) - beforeY) < 20, `scroll drift ${width}`);
    // Korean IME confirmation must not submit the unfinished composition.
    await input.dispatchEvent("keydown", { key: "Enter", code: "Enter", isComposing: true, bubbles: true });
    await page.waitForTimeout(100);
    assert.equal(requests.length, 1, "IME must not send");
    await input.press("Enter");
    await page.waitForFunction(() => document.querySelectorAll("[data-runtime-turn$='-answer']").length === 2);
    await page.waitForTimeout(150);
    assert.equal(requests.length, 2);
    assert.equal(requests[1].query, "Keep the same city");
    assert.equal(requests[1].conversation.length, 2);
    await input.click();
    await input.pressSequentially("Compare these options", { delay: 25 });
    assert.equal(await input.inputValue(), "Compare these options");
    assert.equal(await input.evaluate(el => el === document.activeElement), true);
    assert.equal(await page.locator("#q").inputValue(), "");
    await input.press("Enter");
    await page.locator("[data-followup-composer].is-error").waitFor();
    assert.equal(await input.inputValue(), "Compare these options", "failure preserves draft");
    await page.locator("[data-action='runFollowUp']").click();
    await page.waitForFunction(() => document.querySelectorAll("[data-runtime-turn$='-answer']").length === 3);
    assert.equal(requests.length, 4);
    assert.equal(requests[3].query, "Compare these options");
    assert.equal(requests[3].conversation.length, 4, "failed query not duplicated");
    assert.equal(await page.evaluate(() => {
      const composer = document.querySelector("[data-followup-composer]");
      return [...document.querySelectorAll("[data-runtime-turn]")].every(turn =>
        Boolean(turn.compareDocumentPosition(composer) & Node.DOCUMENT_POSITION_FOLLOWING));
    }), true, "all answers precede the follow-up composer as in approved HTML");
    // S1 now follows the new answer, not the input; user chooses to continue.
    await input.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `work/followup-continuity-${width}.png` });
    console.log(`PASS ${width}px: stable DOM/focus/scroll, IME, follow-up context, failure/retry`);
    await page.close();
  }
} finally {
  await browser.close();
}
