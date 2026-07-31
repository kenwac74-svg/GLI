import { createHash } from "node:crypto";
import type { Asset } from "./assets.ts";
import {
  searchAssets,
  type SearchCriteria,
  type SearchResult,
} from "./search.ts";

export type AdvisorSearchResult = SearchResult & {
  advisor: {
    mode: "openai" | "rules";
    model: string | null;
    groundedAssetIds: string[];
  };
  citations: Array<{ assetId: string; label: string }>;
};

type AdvisorOptions = {
  provider?: string;
  apiKey?: string;
  model?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
  safetyIdentifier?: string;
  context?: SearchCriteria | null;
};

type ModelResult = {
  answer: string;
  clarification: string | null;
  selectedAssetIds: string[];
  reasons: Array<{ assetId: string; items: string[] }>;
};

const DEFAULT_MODEL = "gpt-5.6-sol";
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
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  const model = options.model ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL;

  if (provider !== "openai" || !apiKey || baseline.matches.length === 0) {
    return fallback;
  }

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

function validateModelResult(text: string | null, candidateIds: string[]): ModelResult | null {
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
    selectedAssetIds.length === 0 ||
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
