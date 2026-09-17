import { createHash } from "node:crypto";
import type { Asset } from "./assets.ts";
import {
  searchAssets,
  type SearchCriteria,
  type SearchResult,
} from "./search.ts";

export type AdvisorSearchResult = SearchResult & {
  advisor: {
    mode: "gemini" | "openai" | "rules";
    model: string | null;
    groundedAssetIds: string[];
  };
  citations: Array<{ assetId: string; label: string }>;
};

export type AdvisorConversationTurn = {
  role: "user" | "assistant";
  text: string;
};

type AdvisorOptions = {
  provider?: string;
  apiKey?: string;
  model?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
  safetyIdentifier?: string;
  context?: SearchCriteria | null;
  conversation?: AdvisorConversationTurn[];
};

type ModelResult = {
  answer: string;
  clarification: string | null;
  selectedAssetIds: string[];
  reasons: Array<{ assetId: string; items: string[] }>;
};

const DEFAULT_OPENAI_MODEL = "gpt-5.6-sol";
const DEFAULT_GEMINI_MODEL = "models/gemini-3.7-flash";
const DEFAULT_GEMINI_THINKING_LEVEL = "medium";
const MAX_GEMINI_CANDIDATES = 8;
const GEMINI_INTERACTIONS_URL =
  "https://generativelanguage.googleapis.com/v1beta/interactions";
const GLI_GEMINI_ADVISOR_INSTRUCTION = `당신은 해외 투자 자산 탐색 플랫폼 GLI의 AI 투자 상담자입니다.

사용자의 질문을 단순 검색어가 아니라 실제 상담 요청으로 이해하세요. 예산, 국가, 도시, 거래 유형, 투자 목적, 목표 수익, 체류 목적과 위험 성향을 파악합니다.

답변 원칙:
1. 사용자의 의도와 조건을 자연스럽게 요약한 뒤 결론부터 답합니다.
2. 기계적인 검색 결과 안내가 아니라 전문 상담자처럼 설명합니다.
3. 제공된 자산과 자료에 없는 사실, 가격, 수익률, 법률 상태는 만들지 않습니다.
4. 표면 임대료와 비용을 제외한 순수익을 구분합니다.
5. 요청한 국가와 도시는 사용자의 동의 없이 변경하지 않습니다.
6. 적합한 자산이 없으면 없다고 설명하고, 어떤 조건을 조정할지 질문합니다.
7. 후보가 있다면 자산명과 추천 이유, 추가 확인 사항을 구체적으로 설명합니다.
8. 면책 문구나 Trust 등급 설명을 모든 답변에 반복하지 않습니다.
9. 정보가 부족할 때는 가장 중요한 확인 질문 하나만 합니다.
10. 사용자의 후속 질문에서는 제공된 최근 대화와 누적 검색 조건을 이어서 사용합니다.
11. 짧은 질문에는 짧게, 복잡한 투자 질문에는 근거를 나누어 답합니다.
12. Gemini, Google 또는 외부 AI 공급사 이름을 언급하지 않고 항상 GLI AI로 행동합니다.
13. GLI가 제공한 자산 데이터에 없는 환율, 시세, 세금, 관리비, 임대료와 수익률을 구체적인 숫자로 만들지 않습니다.
14. 자산 데이터가 제공되지 않았다면 특정 매물을 추천하지 말고, 현재 데이터 조회가 필요하다고 자연스럽게 설명합니다.
15. 간단한 질문은 기본적으로 3~5개 짧은 문단 안에서 답합니다. 복잡한 비교가 아니면 번호, 표, 여러 단계의 제목을 사용하지 않습니다.
16. 사용자의 질문을 첫 문장에서 길게 반복하지 않습니다.
17. Markdown 코드 블록, 취소선, 과도한 굵은 글씨를 사용하지 않습니다. 답변은 일반 텍스트로 작성합니다.
18. 확인된 사실, 합리적인 해석, 추가 조사가 필요한 내용을 구분합니다.
19. 후속 질문은 한 번에 하나만 합니다. 여러 선택지를 제시해야 한다면 하나의 자연스러운 질문 안에 포함합니다.
20. GLI가 제공한 후보가 없는 상태에서는 시장 평균이나 법률 정보를 기억에 의존해 단정하지 않습니다.

말투는 정중하고 자연스러운 한국어를 사용합니다. 지나치게 광고하거나 투자를 재촉하지 않고, 고정된 문장이나 동일한 결론 형식을 반복하지 않습니다.`;
const UNSUPPORTED_ASSURANCE =
  /보장(?:합니다|됩니다|된|할 수)|확정 수익|무조건|법적 검증 완료|권리 검증 완료|guaranteed returns?|legally verified/i;

export async function runAdvisorSearch(
  query: string,
  allAssets: Asset[],
  options: AdvisorOptions = {},
): Promise<AdvisorSearchResult> {
  const baseline = searchAssets(query, allAssets, options.context);
  const fallback = buildFallback(baseline);
  const provider = options.provider ?? process.env.LLM_PROVIDER ?? "disabled";
  const apiKey = options.apiKey ??
    (provider === "gemini"
      ? process.env.GEMINI_API_KEY
      : process.env.OPENAI_API_KEY);
  const model = options.model ??
    (provider === "gemini"
      ? process.env.GEMINI_ADVISOR_MODEL ?? DEFAULT_GEMINI_MODEL
      : process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL);

  if (!apiKey) {
    return fallback;
  }

  if (provider === "gemini") {
    return runGeminiAdvisor(query, baseline, fallback, {
      ...options,
      apiKey,
      model,
    });
  }

  if (provider !== "openai" || baseline.matches.length === 0) return fallback;

  const candidateIds = baseline.matches.map((asset) => asset.id);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 8_000);

  try {
    const response = await (options.fetch ?? fetch)("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        store: false,
        reasoning: { effort: "low" },
        max_output_tokens: 700,
        ...(options.safetyIdentifier
          ? { safety_identifier: options.safetyIdentifier }
          : {}),
        instructions: [
          "You are GLI's Korean-language property advisor.",
          "Use only the supplied candidate facts. Never invent yields, legal status, ownership eligibility, availability, or verification results.",
          "You may reorder or omit candidates, but selectedAssetIds must contain only supplied IDs.",
          "The requested country is a hard boundary. Never recommend an asset from another country unless the user explicitly agrees to expand the country scope.",
          "The requested city is also a hard boundary. Never substitute another city unless the user explicitly agrees to expand the location scope.",
          "Trust Score and Trust Status are immutable server facts.",
          "Explain uncertainty and the next fact to verify. Never promise returns or legal clearance.",
          "Return concise Korean suitable for a consumer product.",
        ].join(" "),
        input: JSON.stringify({
          userQuestion: query,
          parsedCriteria: baseline.criteria,
          candidates: baseline.matches.map(toGroundedCandidate),
        }),
        text: {
          format: {
            type: "json_schema",
            name: "gli_property_advice",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["answer", "clarification", "selectedAssetIds", "reasons"],
              properties: {
                answer: { type: "string", minLength: 1, maxLength: 900 },
                clarification: {
                  anyOf: [
                    { type: "string", minLength: 1, maxLength: 240 },
                    { type: "null" },
                  ],
                },
                selectedAssetIds: {
                  type: "array",
                  minItems: 1,
                  maxItems: candidateIds.length,
                  uniqueItems: true,
                  items: { type: "string", enum: candidateIds },
                },
                reasons: {
                  type: "array",
                  maxItems: candidateIds.length,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["assetId", "items"],
                    properties: {
                      assetId: { type: "string", enum: candidateIds },
                      items: {
                        type: "array",
                        minItems: 1,
                        maxItems: 3,
                        items: { type: "string", minLength: 1, maxLength: 90 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) return fallback;
    const payload = (await response.json()) as unknown;
    const modelResult = validateModelResult(extractOutputText(payload), candidateIds);
    if (!modelResult || containsUnsupportedAssurance(modelResult)) return fallback;

    const byId = new Map(baseline.matches.map((asset) => [asset.id, asset]));
    const reasonsById = new Map(
      modelResult.reasons.map(({ assetId, items }) => [assetId, items]),
    );
    const matches = modelResult.selectedAssetIds.flatMap((id) => {
      const asset = byId.get(id);
      if (!asset) return [];
      return [
        {
          ...asset,
          matchReasons: reasonsById.get(id) ?? asset.matchReasons,
        },
      ];
    });

    return {
      ...baseline,
      answer: modelResult.answer,
      clarification: modelResult.clarification,
      matches,
      advisor: {
        mode: "openai",
        model,
        groundedAssetIds: matches.map((asset) => asset.id),
      },
      citations: matches.map((asset) => ({
        assetId: asset.id,
        label: `${asset.district} · ${asset.title}`,
      })),
    };
  } catch {
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}

async function runGeminiAdvisor(
  query: string,
  baseline: SearchResult,
  fallback: AdvisorSearchResult,
  options: AdvisorOptions & { apiKey: string; model: string },
): Promise<AdvisorSearchResult> {
  const candidates = baseline.matches.slice(0, MAX_GEMINI_CANDIDATES);
  const candidateIds = candidates.map((asset) => asset.id);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);

  try {
    const response = await (options.fetch ?? fetch)(GEMINI_INTERACTIONS_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": options.apiKey,
      },
      body: JSON.stringify({
        model: normalizeGeminiModel(options.model),
        input: JSON.stringify({
          userQuestion: query,
          recentConversation: (options.conversation ?? []).slice(-8),
          parsedCriteria: baseline.criteria,
          exchangeRate: baseline.rate,
          candidates: candidates.map(toGroundedCandidate),
        }),
        system_instruction: GLI_GEMINI_ADVISOR_INSTRUCTION,
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: buildGeminiResponseSchema(candidateIds),
        },
        store: false,
        generation_config: {
          max_output_tokens: 1_400,
          thinking_level:
            process.env.GEMINI_ADVISOR_THINKING_LEVEL ??
            process.env.GEMINI_THINKING_LEVEL ??
            DEFAULT_GEMINI_THINKING_LEVEL,
          thinking_summaries: "none",
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) return fallback;
    const payload = (await response.json()) as unknown;
    const modelResult = validateModelResult(
      extractGeminiOutputText(payload),
      candidateIds,
      candidateIds.length === 0,
    );
    if (!modelResult || containsUnsupportedAssurance(modelResult)) return fallback;

    const byId = new Map(baseline.matches.map((asset) => [asset.id, asset]));
    const reasonsById = new Map(
      modelResult.reasons.map(({ assetId, items }) => [assetId, items]),
    );
    const matches = modelResult.selectedAssetIds.flatMap((id) => {
      const asset = byId.get(id);
      if (!asset) return [];
      return [
        {
          ...asset,
          matchReasons: reasonsById.get(id) ?? asset.matchReasons,
        },
      ];
    });

    return {
      ...baseline,
      answer: modelResult.answer,
      clarification: modelResult.clarification,
      matches,
      advisor: {
        mode: "gemini",
        model: normalizeGeminiModel(options.model),
        groundedAssetIds: matches.map((asset) => asset.id),
      },
      citations: matches.map((asset) => ({
        assetId: asset.id,
        label: `${asset.district} · ${asset.title}`,
      })),
    };
  } catch {
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}

export function createSafetyIdentifier(value: string | null): string | undefined {
  const clean = value?.split(",")[0]?.trim();
  if (!clean) return undefined;
  return createHash("sha256").update(`gli-search:${clean}`).digest("hex");
}

function buildFallback(result: SearchResult): AdvisorSearchResult {
  return {
    ...result,
    advisor: {
      mode: "rules",
      model: null,
      groundedAssetIds: result.matches.map((asset) => asset.id),
    },
    citations: result.matches.map((asset) => ({
      assetId: asset.id,
      label: `${asset.district} · ${asset.title}`,
    })),
  };
}

function toGroundedCandidate(asset: SearchResult["matches"][number]) {
  return {
    id: asset.id,
    title: asset.title,
    country: asset.country,
    city: asset.city,
    district: asset.district,
    transaction: asset.transaction,
    propertyType: asset.propertyType,
    bedrooms: asset.bedrooms,
    bathrooms: asset.bathrooms,
    price: asset.price,
    currency: asset.currency,
    areaSqm: asset.areaSqm,
    summary: asset.summary,
    trustScore: asset.trustScore,
    trustStatus: asset.trustStatus,
    isGliDirect: asset.isGliDirect,
    updatedAt: asset.updatedAt,
    strengths: asset.strengths,
    checks: asset.checks,
  };
}

function extractOutputText(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.output_text === "string") return payload.output_text;
  if (!Array.isArray(payload.output)) return null;

  for (const item of payload.output) {
    if (!isRecord(item) || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (isRecord(content) && typeof content.text === "string") return content.text;
    }
  }
  return null;
}

function validateModelResult(
  text: string | null,
  candidateIds: string[],
  allowEmptySelection = false,
): ModelResult | null {
  if (!text) return null;
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(value) || typeof value.answer !== "string") return null;
  if (
    value.clarification !== null &&
    typeof value.clarification !== "string"
  ) {
    return null;
  }
  if (!Array.isArray(value.selectedAssetIds) || !Array.isArray(value.reasons)) {
    return null;
  }

  const allowed = new Set(candidateIds);
  const selectedAssetIds = value.selectedAssetIds.filter(
    (id): id is string => typeof id === "string",
  );
  if (
    (!allowEmptySelection && selectedAssetIds.length === 0) ||
    (allowEmptySelection && selectedAssetIds.length !== 0) ||
    selectedAssetIds.length !== value.selectedAssetIds.length ||
    new Set(selectedAssetIds).size !== selectedAssetIds.length ||
    selectedAssetIds.some((id) => !allowed.has(id))
  ) {
    return null;
  }

  const reasons: ModelResult["reasons"] = [];
  for (const reason of value.reasons) {
    if (
      !isRecord(reason) ||
      typeof reason.assetId !== "string" ||
      !allowed.has(reason.assetId) ||
      !Array.isArray(reason.items) ||
      reason.items.length === 0 ||
      reason.items.length > 3 ||
      reason.items.some((item) => typeof item !== "string" || !item.trim())
    ) {
      return null;
    }
    reasons.push({
      assetId: reason.assetId,
      items: reason.items.map((item) => String(item).trim()),
    });
  }

  const answer = value.answer.trim();
  const clarification =
    typeof value.clarification === "string" ? value.clarification.trim() : null;
  if (!answer || (value.clarification !== null && !clarification)) return null;
  return { answer, clarification, selectedAssetIds, reasons };
}

function normalizeGeminiModel(model: string): string {
  return model.startsWith("models/") ? model : `models/${model}`;
}

function buildGeminiResponseSchema(candidateIds: string[]) {
  const assetIdSchema = candidateIds.length > 0
    ? { type: "string", enum: candidateIds }
    : { type: "string" };
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      answer: {
        type: "string",
        description: "자산 데이터에 근거한 자연스러운 한국어 상담 답변",
      },
      clarification: {
        type: ["string", "null"],
        description: "필요한 경우에만 묻는 하나의 후속 질문",
      },
      selectedAssetIds: {
        type: "array",
        minItems: candidateIds.length > 0 ? 1 : 0,
        maxItems: candidateIds.length,
        uniqueItems: true,
        items: assetIdSchema,
      },
      reasons: {
        type: "array",
        maxItems: candidateIds.length,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            assetId: assetIdSchema,
            items: {
              type: "array",
              minItems: 1,
              maxItems: 3,
              items: { type: "string" },
            },
          },
          required: ["assetId", "items"],
        },
      },
    },
    required: ["answer", "clarification", "selectedAssetIds", "reasons"],
  };
}

function extractGeminiOutputText(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.output_text === "string") return payload.output_text;
  if (!Array.isArray(payload.steps)) return null;

  for (const step of [...payload.steps].reverse()) {
    if (!isRecord(step) || step.type !== "model_output" || !Array.isArray(step.content)) {
      continue;
    }
    const text = step.content
      .filter(isRecord)
      .map((content) => (typeof content.text === "string" ? content.text : ""))
      .join("")
      .trim();
    if (text) return text;
  }
  return null;
}

function containsUnsupportedAssurance(result: ModelResult): boolean {
  return UNSUPPORTED_ASSURANCE.test(
    [
      result.answer,
      result.clarification ?? "",
      ...result.reasons.flatMap((reason) => reason.items),
    ].join(" "),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
