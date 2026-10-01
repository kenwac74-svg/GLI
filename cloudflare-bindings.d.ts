// Runtime binding contract; secrets remain server-only and are never values here.
declare module "cloudflare:workers" {
  export const env: {
    DB?: import("./worker-runtime").D1Database;
    FILES?: import("./worker-runtime").R2Bucket;
    DEPLOYMENT_STAGE?: string;
    DEMO_AUTH_ENABLED?: string;
    DEMO_SOURCE_AUTO_APPROVAL?: string;
  };
}
