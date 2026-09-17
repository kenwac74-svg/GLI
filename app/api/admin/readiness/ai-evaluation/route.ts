import { NextResponse } from "next/server";
import { recordAiEvaluationRun } from "../../../../../db/ai-evaluation-runs.ts";
import { listAssets } from "../../../../../lib/assets-data.ts";
import {
  runAiSearchEvaluation,
  type AiEvaluationMode,
} from "../../../../../lib/ai-evaluation.ts";
import {
  requestId,
  requireApiAdmin,
  validateMutationRequest,
  workflowErrorResponse,
} from "../../../../../lib/member-data.ts";

export async function POST(request: Request) {
  const rejected = validateMutationRequest(request);
  if (rejected) return rejected;
  const authorization = await requireApiAdmin(request, "/admin/readiness");
  if (authorization.response) return authorization.response;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const mode = validateMode(body.mode);
    const demoReadOnly = authorization.context.authUser.authProvider === "demo";
    if (demoReadOnly && mode === "openai") {
      return NextResponse.json(
        {
          error: "공개 데모에서는 실제 AI 모델 평가를 실행할 수 없습니다.",
          code: "DEMO_AI_EVALUATION_RULES_ONLY",
        },
        { status: 403, headers: { "cache-control": "no-store" } },
      );
    }

    const apiKey = mode === "openai" ? process.env.OPENAI_API_KEY : undefined;
    if (
      mode === "openai" &&
      (process.env.LLM_PROVIDER !== "openai" || !apiKey)
    ) {
      return NextResponse.json(
        {
          error: "운영 AI 모델과 서버 키가 설정되지 않았습니다.",
          code: "AI_RUNTIME_NOT_CONFIGURED",
        },
        { status: 409, headers: { "cache-control": "no-store" } },
      );
    }

    const source = await listAssets({
      country: "Cambodia",
      city: "Phnom Penh",
      limit: 100,
    });
    const evaluation = await runAiSearchEvaluation(source.assets, {
      mode,
      apiKey,
      model: mode === "openai" ? process.env.OPENAI_MODEL : undefined,
    });
    const result = demoReadOnly
      ? evaluation
      : await recordAiEvaluationRun(
          authorization.context.database,
          evaluation,
          authorization.context.workflowUser.id,
          { requestId: requestId(request) },
        );

    return NextResponse.json(
      {
        result,
        persisted: !demoReadOnly,
        dataMode: source.mode,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return workflowErrorResponse(error);
  }
}

function validateMode(value: unknown): AiEvaluationMode {
  if (value !== "rules" && value !== "openai") {
    throw new RangeError("mode must be rules or openai");
  }
  return value;
}
