import assert from "node:assert/strict";
import test from "node:test";
import { searchAssets } from "../lib/search.ts";

import {
  createSafetyIdentifier,
  runAdvisorSearch,
} from "../lib/ai-search.ts";

const assets = [
  {
    id: "GLI-KH-A",
    country: "Cambodia",
    countryCode: "KH",
    city: "Phnom Penh",
    district: "BKK1",
    transaction: "rent",
    propertyType: "condo",
    bedrooms: 2,
    bathrooms: 2,
    title: "BKK1 2BR residence",
    price: 480,
    currency: "USD",
    areaSqm: 72,
    image: "https://example.test/a.jpg",
    summary: "Central furnished residence",
    trustScore: 79,
    trustStatus: "VERIFIED",
    isGliDirect: true,
    updatedAt: "2026-07-31T00:00:00.000Z",
    strengths: ["중심 입지"],
    checks: ["실제 임대료"],
  },
  {
    id: "GLI-KH-B",
    country: "Cambodia",
    countryCode: "KH",
    city: "Phnom Penh",
    district: "Tonle Bassac",
    transaction: "rent",
    propertyType: "condo",
    bedrooms: 2,
    bathrooms: 2,
    title: "Tonle Bassac 2BR condo",
    price: 500,
    currency: "USD",
    areaSqm: 80,
    image: "https://example.test/b.jpg",
    summary: "Riverside district residence",
    trustScore: 71,
    trustStatus: "REVIEWING",
    isGliDirect: false,
    updatedAt: "2026-07-31T00:00:00.000Z",
    strengths: ["강변 생활권"],
    checks: ["관리비"],
  },
];

test("uses the deterministic advisor when the LLM provider is disabled", async () => {
  let called = false;
  const result = await runAdvisorSearch("월 500달러 이하 2베드 임대", assets, {
    provider: "disabled",
    fetch: async () => {
      called = true;
      throw new Error("must not call");
    },
  });

  assert.equal(called, false);
  assert.equal(result.advisor.mode, "rules");
  assert.deepEqual(
    result.citations.map((citation) => citation.assetId),
    result.matches.map((asset) => asset.id),
  );
});

test("grounds OpenAI advice in server-selected assets without changing Trust Score", async () => {
  let requestBody;
  const result = await runAdvisorSearch("월 500달러 이하 2베드 임대", assets, {
    provider: "openai",
    apiKey: "test-key",
    model: "gpt-test",
    safetyIdentifier: "hashed-user",
    fetch: async (_url, init) => {
      requestBody = JSON.parse(String(init.body));
      return Response.json({
        output_text: JSON.stringify({
          answer: "두 후보 모두 예산 안이지만 실제 임대 조건을 추가 확인해야 합니다.",
          clarification: "선호 지역과 입주 시기를 알려주시겠어요?",
          selectedAssetIds: ["GLI-KH-B", "GLI-KH-A"],
          reasons: [
            { assetId: "GLI-KH-B", items: ["예산 상한 일치", "강변 생활권"] },
            { assetId: "GLI-KH-A", items: ["예산 범위", "GLI Direct"] },
          ],
        }),
      });
    },
  });

  assert.equal(result.advisor.mode, "openai");
  assert.deepEqual(
    result.matches.map((asset) => asset.id),
    ["GLI-KH-B", "GLI-KH-A"],
  );
  assert.deepEqual(
    result.matches.map((asset) => asset.trustScore),
    [71, 79],
  );
  assert.deepEqual(result.matches[0].matchReasons, ["예산 상한 일치", "강변 생활권"]);
  assert.equal(requestBody.store, false);
  assert.equal(requestBody.reasoning.effort, "low");
  assert.equal(requestBody.text.format.strict, true);
  assert.equal(requestBody.safety_identifier, "hashed-user");
  assert.doesNotMatch(requestBody.input, /example\.test|sourceUrl|contact/i);
});

test("uses Gemini 3.7 Flash for grounded conversational advice", async () => {
  let requestUrl;
  let requestBody;
  let requestHeaders;
  const result = await runAdvisorSearch("월 500달러 이하 2베드 임대", assets, {
    provider: "gemini",
    apiKey: "gemini-test-key",
    model: "models/gemini-3.7-flash",
    conversation: [
      { role: "user", text: "프놈펜 임대 매물을 찾고 있어." },
      { role: "assistant", text: "예산을 알려주시겠어요?" },
    ],
    fetch: async (url, init) => {
      requestUrl = String(url);
      requestHeaders = init.headers;
      requestBody = JSON.parse(String(init.body));
      return Response.json({
        status: "completed",
        steps: [
          {
            type: "model_output",
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  answer: "두 후보 모두 월 예산 안에 있습니다. 강변 생활권을 우선하면 Tonle Bassac 후보부터 실제 관리비를 확인하는 편이 좋습니다.",
                  clarification: "BKK1 중심 입지와 강변 생활권 중 어느 쪽을 더 선호하시나요?",
                  selectedAssetIds: ["GLI-KH-B", "GLI-KH-A"],
                  reasons: [
                    { assetId: "GLI-KH-B", items: ["예산 범위", "강변 생활권"] },
                    { assetId: "GLI-KH-A", items: ["예산 범위", "중심 입지"] },
                  ],
                }),
              },
            ],
          },
        ],
      });
    },
  });

  assert.equal(result.advisor.mode, "gemini");
  assert.equal(result.advisor.model, "models/gemini-3.7-flash");
  assert.deepEqual(result.matches.map((asset) => asset.id), ["GLI-KH-B", "GLI-KH-A"]);
  assert.equal(requestUrl, "https://generativelanguage.googleapis.com/v1beta/interactions");
  assert.equal(requestHeaders["x-goog-api-key"], "gemini-test-key");
  assert.equal(requestBody.model, "models/gemini-3.7-flash");
  assert.equal(requestBody.store, false);
  assert.equal(requestBody.generation_config.thinking_level, "medium");
  assert.equal(requestBody.generation_config.max_output_tokens, 1400);
  assert.equal(requestBody.response_format.mime_type, "application/json");
  assert.doesNotMatch(requestBody.input, /example\.test|sourceUrl|contact/i);
  assert.equal(JSON.parse(requestBody.input).recentConversation.length, 2);
});

test("lets Gemini answer naturally when the current GLI data has no matches", async () => {
  let called = false;
  const result = await runAdvisorSearch("시아누크빌 2베드 매매", [], {
    provider: "gemini",
    apiKey: "gemini-test-key",
    fetch: async (_url, init) => {
      called = true;
      const body = JSON.parse(String(init.body));
      assert.deepEqual(JSON.parse(body.input).candidates, []);
      assert.equal(body.response_format.schema.properties.selectedAssetIds.maxItems, 0);
      return Response.json({
        status: "completed",
        steps: [
          {
            type: "model_output",
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  answer: "현재 GLI가 확인한 시아누크빌 후보 중에는 요청 조건에 맞는 매물이 없습니다. 국가와 도시는 그대로 유지했습니다.",
                  clarification: "예산이나 침실 수 중 어느 조건을 먼저 조정해 볼까요?",
                  selectedAssetIds: [],
                  reasons: [],
                }),
              },
            ],
          },
        ],
      });
    },
  });

  assert.equal(called, true);
  assert.equal(result.advisor.mode, "gemini");
  assert.deepEqual(result.matches, []);
});

test("rejects unknown asset IDs and falls back to grounded rules", async () => {
  const result = await runAdvisorSearch("월 500달러 이하 2베드 임대", assets, {
    provider: "openai",
    apiKey: "test-key",
    fetch: async () =>
      Response.json({
        output_text: JSON.stringify({
          answer: "새 매물을 찾았습니다.",
          clarification: null,
          selectedAssetIds: ["INVENTED-ASSET"],
          reasons: [{ assetId: "INVENTED-ASSET", items: ["추천"] }],
        }),
      }),
  });

  assert.equal(result.advisor.mode, "rules");
  assert.ok(result.matches.every((asset) => asset.id !== "INVENTED-ASSET"));
});

test("rejects investment assurances and provider failures", async () => {
  const assured = await runAdvisorSearch("월 500달러 이하 2베드 임대", assets, {
    provider: "openai",
    apiKey: "test-key",
    fetch: async () =>
      Response.json({
        output_text: JSON.stringify({
          answer: "수익을 보장합니다.",
          clarification: null,
          selectedAssetIds: ["GLI-KH-A"],
          reasons: [{ assetId: "GLI-KH-A", items: ["예산 범위"] }],
        }),
      }),
  });
  const failed = await runAdvisorSearch("월 500달러 이하 2베드 임대", assets, {
    provider: "openai",
    apiKey: "test-key",
    fetch: async () => {
      throw new Error("provider unavailable");
    },
  });

  assert.equal(assured.advisor.mode, "rules");
  assert.equal(failed.advisor.mode, "rules");
});

test("hashes a request identifier before it leaves the service", () => {
  const identifier = createSafetyIdentifier("203.0.113.7, 10.0.0.1");
  assert.equal(identifier?.length, 64);
  assert.doesNotMatch(identifier ?? "", /203\.0\.113\.7/);
  assert.equal(createSafetyIdentifier(null), undefined);
});

test("OpenRouter sends identical grounded input with conversation and an explicit model", async () => {
  const requests = [];
  for (const model of ["openai/test", "anthropic/test", "google/test"]) {
    const result = await runAdvisorSearch("월 500달러 이하 2베드 임대", assets, {
      provider: "openrouter", apiKey: "router-test-key", model,
      conversation: [{ role: "user", text: "프놈펜에 거주할 집을 찾고 있어." }],
      fetch: async (url, init) => {
        assert.equal(url, "https://openrouter.ai/api/v1/chat/completions");
        assert.equal(init.headers.authorization, "Bearer router-test-key");
        const body = JSON.parse(init.body);
        requests.push(body);
        assert.equal(body.model, model);
        assert.equal(body.provider.allow_fallbacks, false);
        assert.equal(body.provider.require_parameters, true);
        assert.equal(body.reasoning.exclude, true);
        assert.equal(body.response_format.json_schema.strict, true);
        assert.equal(body.models, undefined);
        return Response.json({ model, provider: "test-endpoint", choices: [{ finish_reason: "stop", message: { content: JSON.stringify({
          answer: "두 후보의 실제 관리비와 가구 상태를 확인하겠습니다.", clarification: null,
          selectedAssetIds: ["GLI-KH-A"], reasons: [{ assetId: "GLI-KH-A", items: ["요청 지역"] }],
        }) } }], usage: { prompt_tokens: 123, completion_tokens: 45, cost: 0.001 } });
      },
    });
    assert.equal(result.advisor.mode, "openrouter");
    assert.equal(result.advisor.model, model);
    assert.equal(result.advisor.resolvedModel, model);
    assert.equal(result.matches[0].trustScore, assets[0].trustScore);
    assert.deepEqual(result.advisor.usage, { inputTokens: 123, outputTokens: 45, costUsd: 0.001 });
  }
  const inputs = requests.map((body) => JSON.parse(body.messages[1].content));
  for (const input of inputs) {
    assert.equal(input.recentConversation.length, 1);
    assert.equal(input.exchangeRate, undefined);
    assert.ok(input.candidates.every((candidate) => candidate.trustScore === undefined && candidate.trustGrade));
    assert.doesNotMatch(JSON.stringify(input), /example\.test|sourceUrl|contact/i);
    assert.deepEqual(input.candidates, inputs[0].candidates);
  }
});

test("OpenRouter can counsel without candidates instead of returning a canned answer", async () => {
  const result = await runAdvisorSearch("시아누크빌 2베드 매매", [], {
    provider: "openrouter", apiKey: "test", model: "vendor/model",
    fetch: async (_url, init) => {
      const body = JSON.parse(init.body);
      assert.equal(body.response_format.json_schema.schema.properties.selectedAssetIds.maxItems, 0);
      return Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify({
        answer: "현재 제공된 자료에는 조건에 맞는 후보가 없습니다.", clarification: "완공 매물만 찾으시나요?",
        selectedAssetIds: [], reasons: [],
      }) } }] });
    },
  });
  assert.equal(result.advisor.mode, "openrouter");
  assert.deepEqual(result.matches, []);
});

test("OpenRouter receives observed VND/KRW facts for advice; demo rates never become evidence", async () => {
  const asset = { ...assets[0], id: "VN-FX", country: "Vietnam", city: "Ho Chi Minh City", district: "District 2",
    price: 27000000, maxPrice: 28000000, currency: "VND", priceUsdReference: { amount: 1080, provider: "test", asOf: "2026-10-01" } };
  const observed = { krwPerUsd: 1350, asOf: "2026-10-01", rates: { USD: 1, VND: 25000, KRW: 1350 } };
  for (const rate of [observed, { krwPerUsd: 1380, asOf: "demo-reference" }, { ...observed, rates: { USD: 1, KRW: 1350 } }]) {
    const result = await runAdvisorSearch("베트남 호치민 2베드 임대 원화로 알려줘", [asset], {
      provider: "openrouter", apiKey: "test", model: "vendor/model",
      preparedSearch: { ...searchAssets("베트남 임대", []), matches: [{ ...asset, matchReasons: [] }], rate },
      fetch: async (_url, init) => {
        const request = JSON.parse(init.body);
        const input = JSON.parse(request.messages[1].content);
        assert.deepEqual(input.exchangeRate, rate.rates ? rate : undefined);
        assert.equal(input.candidates[0].locationLabel, "2군, 호치민, 베트남");
        assert.equal(input.candidates[0].price, asset.price);
        assert.deepEqual(input.candidates[0].priceUsdReference, asset.priceUsdReference);
        assert.deepEqual(input.candidates[0].priceKrwReference, rate === observed
          ? { amount: 1458000, maxAmount: 1512000, currency: "KRW", asOf: observed.asOf } : null);
        assert.match(input.currencyRule, /Never ask the user.*even when the reference is absent/);
        assert.match(input.currencyRule, /retain the original asking price/);
        assert.match(request.messages[0].content, /사용자에게 환율 입력이나 선택을 요청하지 않습니다/);
        return Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify({
          answer: "제시 월세를 기준으로 비교할 수 있습니다.", clarification: null, selectedAssetIds: [asset.id], reasons: [],
        }) } }] });
      },
    });
    assert.equal(result.advisor.mode, "openrouter");
  }
});

test("OpenRouter failures stay failures and do not leak upstream messages or keys", async () => {
  for (const status of [401, 402, 429, 503]) {
    const result = await runAdvisorSearch("월 500달러 이하 임대", assets, {
      provider: "openrouter", apiKey: "secret-test-key", model: "vendor/model",
      fetch: async () => Response.json({ error: { message: "secret-test-key upstream detail" } }, { status }),
    });
    assert.equal(result.advisor.mode, "rules");
    assert.deepEqual(result.advisor.failure, { code: "http_error", status });
    assert.doesNotMatch(JSON.stringify(result), /secret-test-key|upstream detail/);
  }
});

test("OpenRouter may decline all candidates when required facts are unverified", async () => {
  const result = await runAdvisorSearch("월 500달러 이하 임대", assets, {
    provider: "openrouter", apiKey: "test", model: "vendor/model",
    fetch: async (_url, init) => {
      const body = JSON.parse(init.body);
      assert.equal(body.response_format.json_schema.schema.properties.selectedAssetIds.minItems, 0);
      return Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify({
        answer: "요청하신 가구 포함 여부는 아직 확인되지 않았습니다.",
        clarification: null, selectedAssetIds: [], reasons: [],
      }) } }] });
    },
  });
  assert.equal(result.advisor.mode, "openrouter");
  assert.deepEqual(result.matches, []);
});

test("OpenRouter rejects unknown IDs, incomplete JSON and unsupported assurances", async () => {
  for (const [finishReason, answer, ids, failure] of [
    ["stop", "확인하겠습니다.", ["INVENTED"], "invalid_output"],
    ["length", "확인하겠습니다.", ["GLI-KH-A"], "incomplete_output"],
    ["stop", "수익을 보장합니다.", ["GLI-KH-A"], "unsupported_assurance"],
  ]) {
    const result = await runAdvisorSearch("월 500달러 이하 임대", assets, {
      provider: "openrouter", apiKey: "test", model: "vendor/model",
      fetch: async () => Response.json({ choices: [{ finish_reason: finishReason, message: { content: JSON.stringify({
        answer, clarification: null, selectedAssetIds: ids, reasons: [],
      }) } }] }),
    });
    assert.equal(result.advisor.mode, "rules");
    assert.equal(result.advisor.failure.code, failure);
  }
});
