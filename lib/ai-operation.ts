import { createHash, randomUUID } from "node:crypto";
import type { D1DatabaseLike } from "../db/user-workflows.ts";

// GLI-SPEC: GS-012 / P38. One search request, up to bounded provider stages.
// This is an operating request cap, NOT a dollar ceiling or customer entitlement.
export const AI_DAILY_LIMITS = { global: 300, actor: 100 } as const;
type Stage = "decision" | "intent" | "discovery" | "translation" | "advisor";
type Options = {
  database: () => Promise<D1DatabaseLike>;
  actor: string;
  signal: AbortSignal;
  fetchImpl?: typeof fetch;
  now?: () => number;
};

export function createAiOperation(options: Options) {
  const id = randomUUID();
  const actorKey = createHash("sha256").update(`gli-ai-v1:${options.actor}`).digest("hex");
  let reservation: Promise<D1DatabaseLike> | undefined;
  let blocked = false;
  let auditFailed = false;
  let started = false;
  let calls = 0;
  const now = options.now ?? Date.now;

  async function reserve() {
    options.signal.throwIfAborted();
    if (auditFailed) throw new Error("AI_USAGE_UNAVAILABLE");
    reservation ??= (async () => {
      const database = await options.database();
      const time = now();
      // Approved daily policy uses Asia/Seoul, consistently on every instance.
      const day = new Date(time + 9 * 60 * 60_000).toISOString().slice(0, 10);
      options.signal.throwIfAborted();
      const result = await database.prepare(`
        INSERT INTO ai_operation_requests (id, day_key, actor_key, started_at)
        SELECT ?, ?, ?, ?
        WHERE (SELECT count(*) FROM ai_operation_requests WHERE day_key = ?) < ?
          AND (SELECT count(*) FROM ai_operation_requests WHERE day_key = ? AND actor_key = ?) < ?
      `).bind(id, day, actorKey, time, day, AI_DAILY_LIMITS.global, day, actorKey, AI_DAILY_LIMITS.actor).run();
      if ((result.meta?.changes ?? 0) !== 1) {
        blocked = true;
        throw new Error("AI_DAILY_LIMIT_REACHED");
      }
      started = true;
      return database;
    })().catch(error => {
      if (!blocked && !options.signal.aborted) auditFailed = true;
      throw error;
    });
    return reservation;
  }

  function forStage(stage: Stage): typeof fetch {
    return async (input, init) => {
      options.signal.throwIfAborted();
      const database = await reserve();
      const signal = init?.signal
        ? AbortSignal.any([options.signal, init.signal]) : options.signal;
      signal.throwIfAborted();
      // One optional decision plus the existing bounded stages; no tool loop.
      if (++calls > 10) throw new Error("AI_STAGE_LIMIT_REACHED");
      const callId = randomUUID();
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
      const provider = url.hostname === "openrouter.ai" ? "openrouter"
        : url.hostname === "generativelanguage.googleapis.com" ? "gemini"
        : url.hostname === "api.openai.com" ? "openai" : null;
      if (!provider) throw new Error("AI_PROVIDER_REJECTED");
      const requestBody = typeof init?.body === "string" ? JSON.parse(init.body) : {};
      const model = String(requestBody.model ?? url.pathname.match(/models\/([^:]+)/)?.[1] ?? "unknown").slice(0, 120);
      // Persist before dispatch: an interrupted response remains 'started',
      // with unknown usage, never zero spend. No prompts, keys or IPs stored.
      try {
        await database.prepare(`INSERT INTO ai_provider_calls
          (id, operation_id, stage, provider, model, status, started_at)
          VALUES (?, ?, ?, ?, ?, 'started', ?)`)
          .bind(callId, id, stage, provider, model, now()).run();
      } catch { auditFailed = true; throw new Error("AI_USAGE_UNAVAILABLE"); }
      let response: Response | undefined;
      let payload: unknown;
      let status = "error";
      try {
        signal.throwIfAborted();
        response = await (options.fetchImpl ?? fetch)(input, { ...init, signal });
        try { payload = await response.clone().json(); } catch { /* Unknown usage stays null. */ }
        status = response.ok ? "received" : "http_error";
        return response;
      } catch (error) {
        status = signal.aborted ? "aborted" : "error";
        throw error;
      } finally {
        const usage = providerUsage(payload);
        try {
          await database.prepare(`UPDATE ai_provider_calls SET status = ?, http_status = ?,
            input_tokens = ?, output_tokens = ?, total_tokens = ?, cost_usd = ?, finished_at = ? WHERE id = ?`)
            .bind(status, response?.status ?? null, usage.input, usage.output, usage.total, usage.cost, now(), callId).run();
        } catch {
          auditFailed = true;
          console.warn("[ai-operation] usage update failed; further paid stages disabled");
        }
      }
    };
  }

  return {
    forStage,
    // In-flight discovery is private to one authenticated account or demo pool.
    scope: actorKey,
    get state() { return { started, blocked, auditFailed }; },
  };
}

function providerUsage(payload: unknown) {
  const body = record(payload);
  const usage = record(body.usage ?? body.usageMetadata);
  const number = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
  return {
    input: number(usage.prompt_tokens ?? usage.input_tokens ?? usage.promptTokenCount ?? usage.total_input_tokens),
    output: number(usage.completion_tokens ?? usage.output_tokens ?? usage.candidatesTokenCount ?? usage.total_output_tokens),
    total: number(usage.total_tokens ?? usage.totalTokenCount),
    cost: number(usage.cost),
  };
}
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
