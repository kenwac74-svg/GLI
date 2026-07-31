export async function isDemoBillingEnabled(): Promise<boolean> {
  const { env } = await import("cloudflare:workers");
  return (
    env.DEPLOYMENT_STAGE === "demo" &&
    env.DEMO_AUTH_ENABLED === "true"
  );
}
