import assert from "node:assert/strict";
import test from "node:test";
import { isDemoGuestAdvisor, isLocalAdvisorPreview, selectAdvisorProvider } from "../lib/advisor-runtime.ts";

test("guest advisor requires explicit demo stage and flag", () => {
  assert.equal(isDemoGuestAdvisor({ DEPLOYMENT_STAGE: "demo", GLI_DEMO_GUEST_AI: "enabled" }), true);
  for (const stage of [undefined, "development", "production"]) {
    assert.equal(isDemoGuestAdvisor({ DEPLOYMENT_STAGE: stage, GLI_DEMO_GUEST_AI: "enabled" }), false);
  }
  assert.equal(isDemoGuestAdvisor({ DEPLOYMENT_STAGE: "demo" }), false);
  assert.equal(isDemoGuestAdvisor({ DEPLOYMENT_STAGE: "demo", GLI_DEMO_GUEST_AI: "disabled" }), false);
});

test("OpenRouter is explicit and never uses a direct key as a substitute", () => {
  const env = { LLM_PROVIDER: "openrouter", OPENAI_API_KEY: "test", GEMINI_API_KEY: "test" };
  assert.equal(selectAdvisorProvider(env), "disabled");
  assert.equal(selectAdvisorProvider({ ...env, OPENROUTER_API_KEY: "test" }), "disabled");
  assert.equal(selectAdvisorProvider({ ...env, OPENROUTER_API_KEY: "test", OPENROUTER_MODEL: "vendor/model" }), "openrouter");
  assert.equal(selectAdvisorProvider({ ...env, LLM_PROVIDER: "disabled" }), "gemini");
  assert.equal(selectAdvisorProvider({ ...env, LLM_PROVIDER: "disabled", GEMINI_ADVISOR: "disabled" }), "disabled");
  assert.equal(selectAdvisorProvider({ GEMINI_API_KEY: "test" }), "gemini");
  assert.equal(selectAdvisorProvider({ ...env, LLM_PROVIDER: "openai" }), "openai");
});

test("OpenRouter trial is opt-in, loopback-only and unavailable in production", () => {
  const env = { NODE_ENV: "development", GLI_LOCAL_AI_PREVIEW: "enabled" };
  for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
    assert.equal(isLocalAdvisorPreview(`http://${host}:8779/explore`, "openrouter", env), true);
  }
  assert.equal(isLocalAdvisorPreview("https://glibiz.net/explore", "openrouter", env), false);
  assert.equal(isLocalAdvisorPreview("http://localhost.evil.test/explore", "openrouter", env), false);
  assert.equal(isLocalAdvisorPreview("invalid", "openrouter", env), false);
  assert.equal(isLocalAdvisorPreview("http://localhost:8779", "openrouter", { NODE_ENV: "development" }), false);
  assert.equal(isLocalAdvisorPreview("http://localhost:8779", "openrouter", { ...env, NODE_ENV: "production" }), false);
  assert.equal(isLocalAdvisorPreview("http://localhost:8779", "disabled", env), false);
});
