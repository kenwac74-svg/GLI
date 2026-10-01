import { createD1DiscoveryRepository, type DiscoveryRepository } from "../db/discovery-repository.ts";

// GS-004 / P50: explicit production opt-in; no new public write endpoint.
export async function getDiscoveryRepository(): Promise<DiscoveryRepository | null> {
  const { env } = await import("cloudflare:workers");
  const runtime = env as unknown as { DB?: Parameters<typeof createD1DiscoveryRepository>[0]; DISCOVERY_STORAGE?: string; DEPLOYMENT_STAGE?: string };
  const mode = process.env.DISCOVERY_STORAGE ?? runtime.DISCOVERY_STORAGE;
  const stage = process.env.DEPLOYMENT_STAGE ?? runtime.DEPLOYMENT_STAGE;
  const enabled = mode === "d1" || (mode !== "disabled" &&
    (stage === "demo" || stage === "development" || process.env.NODE_ENV === "development"));
  if (!enabled) return null;
  if (!runtime.DB) throw new Error("Durable discovery requires D1 binding DB");
  return createD1DiscoveryRepository(runtime.DB);
}
