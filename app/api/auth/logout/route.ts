import { NextResponse } from "next/server";
import { DEMO_AUTH_COOKIE, safeReturnPath } from "../../../auth";
import { chatGPTSignOutPath, getChatGPTUser } from "../../../chatgpt-auth";

export async function GET(request: Request) {
  const returnTo = safeReturnPath(
    new URL(request.url).searchParams.get("return_to") ?? "/",
  );
  const chatGPTUser = await getChatGPTUser();

  if (chatGPTUser) {
    const response = NextResponse.redirect(
      new URL(chatGPTSignOutPath(returnTo), request.url),
    );
    clearDemoCookie(response, request.url);
    return response;
  }

  const response = NextResponse.redirect(new URL(returnTo, request.url));
  clearDemoCookie(response, request.url);
  return response;
}

function clearDemoCookie(response: NextResponse, requestUrl: string) {
  response.cookies.set(DEMO_AUTH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(requestUrl).protocol === "https:",
    path: "/",
    maxAge: 0,
  });
}
