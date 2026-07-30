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
  assert.match(html, /캄보디아 부동산, 질문부터 시작하세요/);
  assert.match(html, /GLI AI PROPERTY ADVISOR/);
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
  assert.ok(result.matches.length >= 1);
  assert.equal(result.matches[0].id, "GLI-KH-004");
});
