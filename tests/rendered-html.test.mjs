import assert from "node:assert/strict";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the GLI application shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>GLI \| AI Verified Assets<\/title>/i);
  assert.match(html, /국가와 자산의 경계를 넘어, 검증된 투자 기회를 탐색하세요/);
  assert.match(html, /GLI AI INVESTMENT ADVISOR/);
  assert.doesNotMatch(html, /gli-ai-prototype\.html|<iframe/i);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/i);
});

test("returns grounded Cambodia results from the search API", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-api`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(
    new Request("http://localhost/api/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "월 500달러 이하 2베드 강 전망 임대 콘도" }),
    }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );

  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.criteria.country, "Cambodia");
  assert.equal(result.criteria.transaction, "rent");
  assert.equal(result.criteria.bedrooms, 2);
  assert.equal(result.dataMode, "approved-fixture");
  assert.equal(result.advisor.mode, "rules");
  assert.equal(result.advisor.model, null);
  assert.ok(result.matches.length >= 1);
  assert.equal(result.matches[0].id, "GLI-KH-004");
  assert.deepEqual(
    result.citations.map((citation) => citation.assetId),
    result.matches.map((asset) => asset.id),
  );

  const followUpResponse = await worker.fetch(
    new Request("http://localhost/api/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: "예산은 650달러로 넓혀줘",
        context: result.criteria,
      }),
    }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(followUpResponse.status, 200);
  const followUp = await followUpResponse.json();
  assert.equal(followUp.criteria.transaction, "rent");
  assert.equal(followUp.criteria.bedrooms, 2);
  assert.equal(followUp.criteria.wantsRiver, true);
  assert.equal(followUp.criteria.maxPriceUsd, 650);

  const invalidContextResponse = await worker.fetch(
    new Request("http://localhost/api/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: "계속 찾아줘",
        context: { ...result.criteria, country: "Thailand" },
      }),
    }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(invalidContextResponse.status, 400);
  assert.equal(
    (await invalidContextResponse.json()).error.code,
    "INVALID_SEARCH_CONTEXT",
  );
});

test("renders the five-level asset access demo without blockchain purchase language", async () => {
  const response = await render("/assets/GLI-KH-004");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /FREE/);
  assert.match(html, /BASIC/);
  assert.match(html, /STANDARD/);
  assert.match(html, /PREMIUM/);
  assert.match(html, /BUSINESS/);
  assert.match(html, /GLI Cash/);
  assert.match(html, /상위 등급|모든 하위 등급/);
  assert.match(html, /실제 결제.*발생하지 않습니다/);
  assert.doesNotMatch(html, /Confirm Staking|Staking Amount|Connect Wallet|GLIB/i);
});
