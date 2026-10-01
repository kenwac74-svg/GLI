import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createAiOperation, AI_DAILY_LIMITS } from "../lib/ai-operation.ts";

function setup(t) {
  const sql = new DatabaseSync(":memory:");
  sql.exec(readFileSync(new URL("../drizzle/0017_ai_operating_usage.sql", import.meta.url), "utf8"));
  t.after(() => sql.close());
  const database = { prepare(query) {
    return { bind(...values) {
      return { async run() {
        const result = sql.prepare(query).run(...values);
        return { meta: { changes: Number(result.changes) } };
      } };
    } };
  } };
  let dispatched = 0;
  const now = Date.parse("2026-09-23T10:00:00Z");
  const operation = (actor = "test-member", extra = {}) => createAiOperation({
    database: async () => database, actor, signal: new AbortController().signal, now: () => now,
    fetchImpl: async () => {
      dispatched++;
      return Response.json({ usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30, cost: 0.01 } });
    }, ...extra,
  });
  return { sql, operation, dispatched: () => dispatched, now };
}
const call = (op, stage = "advisor") => op.forStage(stage)("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST", body: JSON.stringify({ model: "test-model" }),
});

test("approved 300/100 caps: one operating request covers concurrent paid stages", async t => {
  const fixture = setup(t);
  const op = fixture.operation();
  await Promise.all([call(op, "intent"), call(op, "translation"), call(op, "discovery"), call(op)]);
  assert.deepEqual(AI_DAILY_LIMITS, { global: 300, actor: 100 });
  assert.equal(fixture.sql.prepare("SELECT count(*) AS n FROM ai_operation_requests").get().n, 1);
  assert.equal(fixture.sql.prepare("SELECT count(*) AS n FROM ai_provider_calls").get().n, 4);
  const usage = fixture.sql.prepare("SELECT sum(cost_usd) AS cost, sum(total_tokens) AS tokens FROM ai_provider_calls").get();
  assert.equal(usage.cost, 0.04);
  assert.equal(usage.tokens, 120);
});

test("account and global caps hold under concurrent reservations without provider dispatch", async t => {
  const f = setup(t);
  const first = await Promise.allSettled(Array.from({ length: 110 }, () => call(f.operation("one"))));
  assert.equal(first.filter(result => result.status === "fulfilled").length, 100);
  await Promise.all(Array.from({ length: 200 }, (_, i) => call(f.operation(`member-${i}`))));
  const denied = f.operation("new-member");
  await assert.rejects(call(denied), /AI_DAILY_LIMIT_REACHED/);
  assert.equal(denied.state.blocked, true);
  assert.equal(f.dispatched(), 300);
});

test("failed and discarded responses retain attempts and observed usage", async t => {
  const f = setup(t);
  const op = f.operation("failed", { fetchImpl: async () => Response.json({ usage: { cost: 0.25, prompt_tokens: 44 }, error: "bad" }, { status: 503 }) });
  assert.equal((await call(op)).status, 503);
  const row = f.sql.prepare("SELECT * FROM ai_provider_calls").get();
  assert.equal(row.status, "http_error");
  assert.equal(row.cost_usd, 0.25);
  assert.equal(row.input_tokens, 44);
  assert.equal(row.output_tokens, null);
  assert.equal(f.sql.prepare("SELECT count(*) AS n FROM ai_operation_requests").get().n, 1);
});

test("cancellation stops current fetch and all later paid stages, keeping unknown usage", async t => {
  const f = setup(t);
  const controller = new AbortController();
  let started;
  const ready = new Promise(resolve => { started = resolve; });
  const op = f.operation("cancel", { signal: controller.signal, fetchImpl: async (_url, init) => {
    started();
    return new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true }));
  } });
  const pending = call(op, "intent");
  await ready;
  controller.abort();
  await assert.rejects(pending);
  await assert.rejects(call(op, "discovery"));
  const row = f.sql.prepare("SELECT * FROM ai_provider_calls").get();
  assert.equal(row.status, "aborted");
  assert.equal(row.cost_usd, null);
  assert.equal(f.sql.prepare("SELECT count(*) AS n FROM ai_provider_calls").get().n, 1);
});

test("already aborted and unavailable ledger cannot spend", async t => {
  const f = setup(t);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(call(f.operation("aborted", { signal: controller.signal })));
  const broken = f.operation("broken", { database: async () => { throw new Error("database_down"); } });
  await assert.rejects(call(broken));
  await assert.rejects(call(broken, "discovery"));
  assert.equal(broken.state.auditFailed, true);
  assert.equal(f.dispatched(), 0);
});

test("missing final usage update blocks subsequent paid stages", async t => {
  const f = setup(t);
  const op = f.operation("audit-failure", { fetchImpl: async () => {
    f.sql.exec("DROP TABLE ai_provider_calls");
    return Response.json({});
  } });
  await call(op);
  assert.equal(op.state.auditFailed, true);
  await assert.rejects(call(op, "discovery"), /AI_USAGE_UNAVAILABLE/);
});

test("Asia/Seoul day resets at 15:00 UTC; Gemini unknown cost is not zero", async t => {
  const f = setup(t);
  const op = f.operation("gemini", { now: () => Date.parse("2026-09-23T15:00:00Z"), fetchImpl: async () => Response.json({
    usageMetadata: { promptTokenCount: 80, candidatesTokenCount: 22, totalTokenCount: 120 },
  }) });
  await op.forStage("translation")("https://generativelanguage.googleapis.com/v1beta/models/test-flash:generateContent", {});
  assert.equal(f.sql.prepare("SELECT day_key FROM ai_operation_requests").get().day_key, "2026-09-24");
  const row = f.sql.prepare("SELECT * FROM ai_provider_calls").get();
  assert.equal(row.total_tokens, 120);
  assert.equal(row.cost_usd, null);
  assert.equal(row.model, "test-flash");
});

test("per-operation hard ceiling disallows an accidental paid loop", async t => {
  const f = setup(t);
  const op = f.operation();
  for (let i = 0; i < 10; i++) await call(op);
  await assert.rejects(call(op), /AI_STAGE_LIMIT_REACHED/);
  assert.equal(f.dispatched(), 10);
});

test("public search wires every paid stage through the same ledger and cancellation", () => {
  const route = readFileSync(new URL("../app/api/search/route.ts", import.meta.url), "utf8");
  for (const stage of ["decision", "intent", "translation", "discovery", "advisor"]) assert.ok(route.includes(`operation.forStage("${stage}")`));
  assert.ok(route.includes("signal: request.signal"));
  assert.ok(route.includes("usageClaimed && !deliveredAi"));
});
