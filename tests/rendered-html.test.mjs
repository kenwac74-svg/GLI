import assert from "node:assert/strict";
import test from "node:test";

async function loadWorker(suffix = "") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${suffix}`);
  return (await import(workerUrl.href)).default;
}

const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
const ctx = { waitUntil() {}, passThroughOnException() {} };

test("server-renders the GLI application shell", async () => {
  const worker = await loadWorker("html");
  const response = await worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), env, ctx);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>GLI \| AI Verified Assets<\/title>/i);
  assert.match(html, /캄보디아 부동산, 질문부터 시작하세요/);
  assert.doesNotMatch(html, /gli-ai-prototype\.html|<iframe/i);
});

test("returns grounded Cambodia results from the search API", async () => {
  const worker = await loadWorker("api");
  const response = await worker.fetch(new Request("http://localhost/api/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: "월 500달러 이하 2베드 강 전망 임대 콘도" }),
  }), env, ctx);
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.criteria.transaction, "rent");
  assert.equal(result.criteria.bedrooms, 2);
  assert.equal(result.matches[0].id, "GLI-KH-004");
});
