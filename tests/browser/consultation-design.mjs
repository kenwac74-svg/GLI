// Local-only UI integration QA: all search requests mocked, no paid AI calls.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire(path.join(process.argv[2], "package.json"));
const { chromium } = require("playwright");
const browser = await chromium.launch({ channel: "msedge", headless: true });
const ids = ["GLI-KH-101", "qa-two", "qa-three", "qa-four"];
const matches = ids.map((id, i) => ({ id, title: `프놈펜 검토 후보 ${i+1}`, country: "Cambodia", city: "Phnom Penh", district: "BKK1",
  transaction: "sale", price: 50000 + i*1000, currency: "USD", areaSqm: 32, bedrooms: 1, bathrooms: 1,
  image: "/og.png", trustScore: 72, sourceName: "QA source", matchReasons: ["예산 범위 내 매매 후보"] }));
const result = { answer: "확인된 후보를 비교했습니다.\n\n임대료 계약 근거는 추가 확인이 필요합니다", clarification: null, matches,
  resultSet: { assetIds: ids, returnedCount: 4 }, consultation: { mode: "search", referencedAssetIds: [], missingAssetIds: [] },
  citations: ids.map(id => ({ assetId: id, label: "원문 매물", sourceName: "QA source", url: `https://example.com/${id}` })),
  criteria: { country: "Cambodia", city: "Phnom Penh", transaction: "sale", budgetKrw: 100000000 }, rate: { krwPerUsd: 1380, asOf: "fixture" } };
try {
  for (const width of [320,360,390,412,768,1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    let request;
    let held;
    await page.route("**/api/search", async route => {
      request = route.request().postDataJSON();
      if (request.query === "hold response") { held = route; return; }
      await route.fulfill({ json: request.selectedAssetIds?.length ? { ...result, matches: [...matches].reverse(),
        consultation: { mode: "review", referencedAssetIds: request.selectedAssetIds, missingAssetIds: [] } } : result });
    });
    await page.goto("http://127.0.0.1:8776/explore");
    await page.locator("[data-consult] .kicker").waitFor();
    await page.locator("#q").fill("프놈펜에서 1억원 매매 후보 찾아줘");
    await page.locator("[data-action='runSearch']").click();
    await page.waitForFunction(() => document.querySelectorAll("[data-summary-id]").length === 3);
    assert.deepEqual(await page.locator("[data-summary-id]").evaluateAll(els => els.map(el => el.dataset.summaryId)), ids.slice(0,3));
    assert.deepEqual(await page.locator("[data-results] .card:not([hidden])").evaluateAll(els => els.map(el => el.dataset.id)), ids);
    assert.equal(await page.locator("#asset-GLI-KH-101 h4").textContent(), matches[0].title);
    assert.equal(await page.locator(".lead-more").textContent(), "전체 결과 4건 보기");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `overflow ${width}`);
    assert.equal(await page.locator("[data-followup-input]").evaluate(el => el === document.activeElement), false, "no forced mobile keyboard");
    await page.locator("[data-consult]").screenshot({ path: `work/gli-052-panel-${width}.png` });
    if (width === 390 || width === 1440) {
      await page.locator("#asset-qa-two button.reason").click();
      await page.locator(".pickchip").waitFor();
      const input = page.locator("[data-followup-input]");
      await input.fill("이 자산의 확인 사항은?");
      await page.locator("[data-action='runFollowUp']").click();
      await page.waitForFunction(() => document.querySelectorAll("[data-runtime-turn$='-answer']").length === 2);
      assert.deepEqual(request.selectedAssetIds, ["qa-two"]);
      assert.equal(await page.locator("[data-runtime-turn='2-answer'] .lead-rk").textContent(), "2위");
      assert.deepEqual(await page.locator("[data-results] .card:not([hidden])").evaluateAll(els => els.map(el => el.dataset.id)), ids);
      assert.equal(await page.locator("[data-runtime-turn='1-answer']").isVisible(), false);
      await page.locator(".hist-tog").click();
      assert.equal(await page.locator("[data-runtime-turn='1-answer']").isVisible(), true);
      await input.fill("hold response");
      await page.locator("[data-action='runFollowUp']").click();
      await page.waitForTimeout(100);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.waitForTimeout(100);
      assert.ok(held);
      await held.fulfill({ json: result });
      await page.waitForFunction(() => document.querySelectorAll("[data-runtime-turn$='-answer']").length === 3);
      await page.waitForTimeout(150);
      assert.ok(await page.evaluate(() => scrollY < 100), "S1 must preserve user scroll-away");
      await page.locator(".newans").waitFor({ state: "visible" });
      await page.locator(".newans").click();
      assert.ok(await page.evaluate(() => scrollY > 100));
    }
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px: source-order summaries/cards, responsive layout${[390,1440].includes(width) ? ", selection/review/history/S1" : ""}`);
    await page.close();
  }
} finally { await browser.close(); }
