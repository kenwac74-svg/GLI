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

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const chatGPTUser = await getChatGPTUser();
  if (chatGPTUser) {
    return { ...chatGPTUser, authProvider: "chatgpt" };
  }

  if (!isDemoAuthEnabled()) return null;

  const cookieStore = await cookies();
  if (
    cookieStore.get(DEMO_AUTH_COOKIE)?.value !== DEMO_AUTH_COOKIE_VALUE
  ) {
    return null;
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

export function signInPath(returnTo: string): string {
  return chatGPTSignInPath(returnTo);
}

export function demoSignInPath(returnTo: string): string {
  return `/api/auth/demo?return_to=${encodeURIComponent(
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
