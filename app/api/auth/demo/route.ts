import { NextResponse } from "next/server";
import {
  DEMO_ADMIN_COOKIE_VALUE,
  DEMO_AUTH_COOKIE,
  DEMO_AUTH_COOKIE_VALUE,
  isDemoAdminEnabled,
  isDemoAuthHostAllowed,
  isDemoAuthEnabled,
  safeReturnPath,
} from "../../../auth";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const returnTo = safeReturnPath(
    url.searchParams.get("return_to") ?? "/my",
  );
  const origin = request.headers.get("origin");
  const wantsAdmin = url.searchParams.get("role") === "admin";

  if (
    !isDemoAuthEnabled() ||
    (wantsAdmin && !isDemoAdminEnabled()) ||
    !isDemoAuthHostAllowed(url.hostname) ||
    origin !== url.origin
  ) {
    return NextResponse.json(
      { error: "데모 계정은 이 시연 환경에서 사용할 수 없습니다." },
      { status: 403, headers: { "cache-control": "no-store" } },
    );
  }

  const response = NextResponse.redirect(new URL(returnTo, request.url));
  response.headers.set("cache-control", "no-store");
  response.cookies.set(
    DEMO_AUTH_COOKIE,
    wantsAdmin ? DEMO_ADMIN_COOKIE_VALUE : DEMO_AUTH_COOKIE_VALUE,
    {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 12,
    },
  );
  return response;
}
