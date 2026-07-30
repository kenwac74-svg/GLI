import { headers } from "next/headers";
import { redirect } from "next/navigation";

export type ChatGPTUser = { displayName: string; email: string; fullName: string | null };
const SIGN_IN_PATH = "/signin-with-chatgpt";
const SIGN_OUT_PATH = "/signout-with-chatgpt";
const CALLBACK_PATH = "/callback";

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  if (!email) return null;
  const encoded = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName = encoded && requestHeaders.get("oai-authenticated-user-full-name-encoding") === "percent-encoded-utf-8" ? safeDecode(encoded) : null;
  return { displayName: fullName ?? email, email, fullName };
}
export async function requireChatGPTUser(returnTo: string) {
  const user = await getChatGPTUser();
  if (user) return user;
  redirect(chatGPTSignInPath(returnTo));
}
export function chatGPTSignInPath(returnTo: string) { return `${SIGN_IN_PATH}?return_to=${encodeURIComponent(safePath(returnTo))}`; }
export function chatGPTSignOutPath(returnTo = "/") { return `${SIGN_OUT_PATH}?return_to=${encodeURIComponent(safePath(returnTo))}`; }
function safePath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  try { const url = new URL(value, "https://app.local"); if ([SIGN_IN_PATH, SIGN_OUT_PATH, CALLBACK_PATH].includes(url.pathname)) return "/"; return `${url.pathname}${url.search}${url.hash}`; } catch { return "/"; }
}
function safeDecode(value: string) { try { return decodeURIComponent(value); } catch { return null; } }
