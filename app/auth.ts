import { cookies } from "next/headers";
import {
  chatGPTSignInPath,
  getChatGPTUser,
  type ChatGPTUser,
} from "./chatgpt-auth";

export type CurrentUser = ChatGPTUser & {
  authProvider: "chatgpt" | "demo";
};

export const DEMO_AUTH_COOKIE = "gli_demo_session";
export const DEMO_AUTH_COOKIE_VALUE = "family-demo-v1";
export const DEMO_ADMIN_COOKIE_VALUE = "operations-demo-v1";
export const DEMO_ADMIN_EMAIL = "operations-demo@gli.local";

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const chatGPTUser = await getChatGPTUser();
  if (chatGPTUser) {
    return { ...chatGPTUser, authProvider: "chatgpt" };
  }

  if (!isDemoAuthEnabled()) return null;

  const cookieStore = await cookies();
  const demoSession = cookieStore.get(DEMO_AUTH_COOKIE)?.value;
  if (
    demoSession !== DEMO_AUTH_COOKIE_VALUE &&
    demoSession !== DEMO_ADMIN_COOKIE_VALUE
  ) {
    return null;
  }

  if (demoSession === DEMO_ADMIN_COOKIE_VALUE && isDemoAdminEnabled()) {
    return {
      displayName: "GLI 운영 데모",
      email: DEMO_ADMIN_EMAIL,
      fullName: "GLI 운영 데모",
      authProvider: "demo",
    };
  }

  return {
    displayName: "GLI 데모 가족",
    email: "family-demo@gli.local",
    fullName: "GLI 데모 가족",
    authProvider: "demo",
  };
}

export function isDemoAuthEnabled(
  runtimeEnv: Record<string, string | undefined> = process.env,
): boolean {
  return (
    runtimeEnv.DEMO_AUTH_ENABLED === "true" &&
    runtimeEnv.DEPLOYMENT_STAGE === "demo"
  );
}

export function isDemoAdminEnabled(
  runtimeEnv: Record<string, string | undefined> = process.env,
): boolean {
  return (
    isDemoAuthEnabled(runtimeEnv) &&
    runtimeEnv.DEMO_ADMIN_ENABLED === "true"
  );
}

export function signInPath(returnTo: string): string {
  return chatGPTSignInPath(returnTo);
}

export function demoSignInPath(returnTo: string): string {
  return `/api/auth/demo?return_to=${encodeURIComponent(
    safeReturnPath(returnTo),
  )}`;
}

export function demoAdminSignInPath(returnTo = "/admin"): string {
  return `/api/auth/demo?role=admin&return_to=${encodeURIComponent(
    safeReturnPath(returnTo),
  )}`;
}

export function signOutPath(returnTo = "/"): string {
  return `/api/auth/logout?return_to=${encodeURIComponent(
    safeReturnPath(returnTo),
  )}`;
}

export function safeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  try {
    const url = new URL(value, "https://app.local");
    if (url.origin !== "https://app.local") return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

export function isDemoAuthHostAllowed(
  hostname: string,
  runtimeEnv: Record<string, string | undefined> = process.env,
): boolean {
  const allowedHosts = (runtimeEnv.DEMO_AUTH_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  return allowedHosts.includes(hostname.toLowerCase());
}
