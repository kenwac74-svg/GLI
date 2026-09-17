import assert from "node:assert/strict";
import test from "node:test";

import { assets } from "../lib/assets.ts";
import {
  AI_EVALUATION_SUITE_VERSION,
  runAiSearchEvaluation,
} from "../lib/ai-evaluation.ts";

test("runs the five-case conversational search rehearsal without a model", async () => {
  let now = Date.parse("2026-07-31T12:00:00.000Z");
  const evaluation = await runAiSearchEvaluation(assets, {
    mode: "rules",
    now: () => (now += 10),
  });

  assert.equal(evaluation.suiteVersion, AI_EVALUATION_SUITE_VERSION);
  assert.equal(evaluation.requestedMode, "rules");
  assert.equal(evaluation.status, "SUCCEEDED");
  assert.equal(evaluation.passedCount, 5);
  assert.equal(evaluation.totalCount, 5);
  assert.ok(evaluation.cases.every((scenario) => scenario.status === "PASS"));
  assert.ok(
    evaluation.cases.every((scenario) =>
      scenario.checks.every((check) => check.passed),
    ),
  );
});

test("requires every grounded OpenAI scenario to complete without a rules fallback", async () => {
  const successful = await runAiSearchEvaluation(assets, {
    mode: "openai",
    apiKey: "test-key",
    model: "gpt-eval",
    fetch: async (_url, init) => {
      const request = JSON.parse(String(init.body));
      const input = JSON.parse(request.input);
      const selected = input.candidates.slice(0, 2);
      return Response.json({
        output_text: JSON.stringify({
          answer:
            "조건에 가까운 후보를 정리했습니다. 실제 계약 조건과 운영 규정을 추가 확인해야 합니다.",
          clarification: null,
          selectedAssetIds: selected.map((candidate) => candidate.id),
          reasons: selected.map((candidate) => ({
            assetId: candidate.id,
            items: ["서버 제공 조건과 일치"],
          })),
        }),
      });
    },
  });
  const failed = await runAiSearchEvaluation(assets, {
    mode: "openai",
    apiKey: "test-key",
    model: "gpt-eval",
    fetch: async () => new Response("upstream unavailable", { status: 503 }),
  });

  assert.equal(successful.status, "SUCCEEDED");
  assert.equal(successful.passedCount, 5);
  assert.ok(
    successful.cases.every((scenario) => scenario.advisorMode === "openai"),
  );
  assert.equal(failed.status, "FAILED");
  assert.ok(failed.passedCount < failed.totalCount);
  assert.ok(
    failed.cases.some((scenario) =>
      scenario.checks.some(
        (check) => check.id === "provider" && check.passed === false,
      ),
    ),
  );
});
