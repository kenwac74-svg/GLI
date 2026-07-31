export type DemoDataEnvironment = Record<string, string | undefined>;

export function isDemoSourceAutoApprovalEnabled(
  runtimeEnv: DemoDataEnvironment = process.env,
): boolean {
  return (
    runtimeEnv.DEPLOYMENT_STAGE === "demo" &&
    runtimeEnv.DEMO_SOURCE_AUTO_APPROVAL === "true"
  );
}

export async function isRuntimeDemoSourceAutoApprovalEnabled(): Promise<boolean> {
  const { env } = await import("cloudflare:workers");
  return isDemoSourceAutoApprovalEnabled(env);
}
