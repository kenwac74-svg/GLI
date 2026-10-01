// Separate local QA browser; every search response is mocked, no paid calls.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire(path.join(process.argv[2], "package.json"));
const { chromium } = require("playwright");
const browser = await chromium.launch({ channel: "msedge", headless: true });
const demoTitle = "Central Phnom Penh studio residence";
const matches = [
  { id: "GLI-KH-101", title: demoTitle, bedrooms: 0 },
  { id: "external-translation-test", title: "Time Square 10 - 1 Bedroom Condo For Sale", bedrooms: 1,
    sourceName: "CAM Realty", sourceUrl: "https://example.test/listing" },
].map(asset => ({ country: "Cambodia", city: "Phnom Penh", district: "BKK1", price: 48888, currency: "USD",
  transaction: "sale", areaSqm: 32, bathrooms: 1, trustScore: 72, image: "/og.png", ...asset }));
const result = { matches, answer: `${demoTitle} 후보를 검토했습니다.`, clarification: null,
  resultSet: { assetIds: matches.map(asset => asset.id), returnedCount: 2 },
  citations: [{ assetId: "GLI-KH-101", label: demoTitle }],
  consultation: { mode: "search", referencedAssetIds: [], missingAssetIds: [] } };
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.addInitScript(data => sessionStorage.setItem("gli:claude-search", JSON.stringify(data)), result);
    await page.route("**/api/search", route => route.fulfill({ json: { ...result,
      answer: "Time Square 10 침실 1개 콘도 매매 후보의 원문을 확인했습니다.",
      matches: [{ ...matches[1], title: "Time Square 10 침실 1개 콘도 매매" }],
      consultation: { mode: "review", referencedAssetIds: [matches[1].id], missingAssetIds: [] } } }));
    await page.goto("http://127.0.0.1:8776/explore?preview=gli052-final");
    await page.locator("[data-runtime-turn='restored-answer']").waitFor();
    assert.match(await page.locator("[data-consult]").textContent(), /프놈펜 중심부 스튜디오 레지던스/);
    assert.doesNotMatch(await page.locator("[data-consult]").textContent(), /Central Phnom Penh/);
    assert.equal(await page.locator("#asset-GLI-KH-101 h4").textContent(), "프놈펜 중심부 스튜디오 레지던스");
    assert.equal(await page.locator("#asset-GLI-KH-101 .cspec").textContent(), "32㎡ · Studio · 1Bath");
    assert.equal(await page.locator("[data-results] .card:not([hidden])").count(), 2);
    await page.locator("[data-followup-input]").fill("두 번째 후보를 자세히 알려줘");
    await page.locator("[data-action='runFollowUp']").click();
    await page.waitForFunction(() => document.querySelector("#asset-external-translation-test h4")?.textContent?.includes("침실 1개"));
    assert.deepEqual(await page.locator("[data-results] .card:not([hidden])").evaluateAll(els => els.map(el => el.dataset.id)), matches.map(asset => asset.id));
    assert.match(await page.locator("[data-runtime-turn='1-answer'] .lead-t").textContent(), /2위Time Square 10 침실 1개/);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.locator("[data-consult]").screenshot({ path: `work/translation-${width}.png` });
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px: saved demo Korean answer/citations/cards, live-source review translation, order/specs/overflow`);
    await page.close();
  }
} finally { await browser.close(); }
