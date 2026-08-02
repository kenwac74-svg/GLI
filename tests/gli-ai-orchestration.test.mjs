import assert from "node:assert/strict";
import test from "node:test";

import { planGliAiRequest } from "../lib/gli-ai-orchestration.ts";

test("keeps simple listing searches on the quick GLI AI path", () => {
  const plan = planGliAiRequest("BKK1 2베드 콘도 찾아줘");

  assert.equal(plan.depth, "quick");
  assert.deepEqual(
    plan.stages.map((stage) => stage.id),
    ["intent", "discovery", "synthesis"],
  );
});

test("routes investment feasibility questions through evidence review", () => {
  const plan = planGliAiRequest(
    "캄보디아에 1억 내외 투자로 한 달 100만원 이상 임대료를 얻을 수 있는 물건을 추천해줘",
  );

  assert.equal(plan.depth, "deep");
  assert.deepEqual(
    plan.stages.map((stage) => stage.id),
    ["intent", "discovery", "review", "synthesis"],
  );
  assert.doesNotMatch(JSON.stringify(plan), /openai|anthropic|google|gemini|claude|gpt/i);
});

test("uses conversation context to review meaningful follow-up questions", () => {
  const plan = planGliAiRequest("그중 순수익이 가장 높은 것은?", {
    hasConversationContext: true,
  });

  assert.equal(plan.depth, "deep");
  assert.ok(plan.stages.some((stage) => stage.id === "review"));
});
