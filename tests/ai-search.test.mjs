import assert from "node:assert/strict";
import test from "node:test";

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
