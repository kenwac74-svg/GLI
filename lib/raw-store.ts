import type { RawObjectStore } from "../ingestion/contracts.ts";

export async function getWorkflowRawStore(): Promise<RawObjectStore> {
  const { env } = await import("cloudflare:workers");
  const runtimeEnv = env as unknown as { FILES?: RawObjectStore };
  if (!runtimeEnv.FILES || typeof runtimeEnv.FILES.put !== "function") {
    throw new Error("Cloudflare R2 binding `FILES` is unavailable");
  }
  return runtimeEnv.FILES;
}
