import vinext from "vinext";
import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json";
import { sites } from "./build/sites-vite-plugin";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  vars: {
    DATA_MODE: process.env.DATA_MODE ?? "approved-fixture",
    DEPLOYMENT_STAGE: process.env.DEPLOYMENT_STAGE ?? "development",
    DEMO_AUTH_ENABLED: process.env.DEMO_AUTH_ENABLED ?? "false",
    DEMO_ADMIN_ENABLED: process.env.DEMO_ADMIN_ENABLED ?? "false",
    DEMO_AUTH_HOSTS: process.env.DEMO_AUTH_HOSTS ?? "",
    LLM_PROVIDER: process.env.LLM_PROVIDER ?? "disabled",
    OPENAI_MODEL: process.env.OPENAI_MODEL ?? "gpt-5.6-sol",
    GEMINI_MODEL: process.env.GEMINI_MODEL ?? "gemini-3.6-flash",
    GEMINI_THINKING_LEVEL: process.env.GEMINI_THINKING_LEVEL ?? "medium",
    GEMINI_DISCOVERY: process.env.GEMINI_DISCOVERY ?? "enabled",
    GEMINI_ADVISOR: process.env.GEMINI_ADVISOR ?? "enabled",
    GEMINI_ADVISOR_MODEL:
      process.env.GEMINI_ADVISOR_MODEL ?? "models/gemini-3.7-flash",
    GEMINI_ADVISOR_THINKING_LEVEL:
      process.env.GEMINI_ADVISOR_THINKING_LEVEL ?? "medium",
    LIVE_CAMBODIA_DISCOVERY:
      process.env.LIVE_CAMBODIA_DISCOVERY ?? "enabled",
  },
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: {
      watch: isCodexSeatbeltSandbox
        ? {
            useFsEvents: false,
            usePolling: true,
            ignored: ["**/.runtime-*/**"],
          }
        : { ignored: ["**/.runtime-*/**"] },
    },
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
    ],
  };
});
