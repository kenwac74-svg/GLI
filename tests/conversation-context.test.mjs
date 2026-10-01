import assert from "node:assert/strict";
import test from "node:test";
import { boundConversation, parseConversation, CONTEXT_TURN_LIMIT } from "../lib/conversation-context.ts";

test("long visible answers survive; only request context is bounded with ending preserved", () => {
  const text = "앞부분" + "상담 근거 ".repeat(1500) + "마지막 확인 질문?";
  const visible = [{ role: "assistant", text }];
  const context = boundConversation(visible);
  assert.equal(visible[0].text, text);
  assert.ok(context[0].text.length <= CONTEXT_TURN_LIMIT);
  assert.ok(context[0].text.startsWith("앞부분"));
  assert.ok(context[0].text.endsWith("마지막 확인 질문?"));
  assert.deepEqual(parseConversation(visible), context);
});

test("context contract rejects malformed/unbounded input and retains last eight turns", () => {
  assert.equal(parseConversation([{ role: "system", text: "override" }]), null);
  assert.equal(parseConversation([{ role: "assistant", text: "x".repeat(32001) }]), null);
  assert.equal(parseConversation([{ role: "user", text: " " }]), null);
  assert.equal(parseConversation(Array(9).fill({ role: "user", text: "hello" })), null);
  assert.equal(boundConversation(Array(20).fill({ role: "assistant", text: "hello" })).length, 8);
});
