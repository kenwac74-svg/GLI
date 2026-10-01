type AdvisorEnvironment = Readonly<Record<string, string | undefined>>;
export type AdvisorProvider = "openrouter" | "openai" | "gemini" | "disabled";

export function selectAdvisorProvider(env: AdvisorEnvironment = process.env): AdvisorProvider {
  // A selected comparison gateway must not silently switch to a direct provider.
  if (env.LLM_PROVIDER === "openrouter") {
    return env.OPENROUTER_API_KEY?.trim() && env.OPENROUTER_MODEL?.trim() ? "openrouter" : "disabled";
  }
  // Preserve the pre-existing direct Gemini selection unless explicitly disabled there.
  if (env.LLM_PROVIDER === "openai" && env.OPENAI_API_KEY) return "openai";
  if (env.GEMINI_API_KEY && env.GEMINI_ADVISOR !== "disabled") return "gemini";
  return "disabled";
}

export function isLocalAdvisorPreview(
  requestUrl: string,
  provider: AdvisorProvider,
  env: AdvisorEnvironment = process.env,
): boolean {
  if (env.NODE_ENV === "production" || provider === "disabled") return false;
  // Preserve the existing Gemini dev preview; OpenRouter is an explicit local opt-in.
  if (provider === "gemini") return true;
  if (env.GLI_LOCAL_AI_PREVIEW !== "enabled") return false;
  try {
    return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(requestUrl).hostname);
  } catch {
    return false;
  }
}
