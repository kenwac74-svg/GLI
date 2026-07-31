import { NextResponse } from "next/server";
import {
  ensureUser,
  getUserDashboard,
  type D1DatabaseLike,
  type UserDashboard,
  type WorkflowUser,
} from "../db/user-workflows.ts";
import {
  DEMO_ADMIN_EMAIL,
  demoSignInPath,
  getCurrentUser,
  isDemoAuthEnabled,
  isDemoAuthHostAllowed,
  signInPath,
  type CurrentUser,
} from "../app/auth";

export type MemberContext = {
  authUser: CurrentUser;
  database: D1DatabaseLike;
  workflowUser: WorkflowUser;
};

export async function getWorkflowDatabase(): Promise<D1DatabaseLike> {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) {
    throw new Error("Cloudflare D1 binding `DB` is unavailable");
  }
  return env.DB;
}

export async function ensureMemberContext(
  authUser: CurrentUser,
): Promise<MemberContext> {
  const database = await getWorkflowDatabase();
  const workflowUser = await ensureUser(database, {
    email: authUser.email,
    displayName: authUser.fullName ?? authUser.displayName,
  });

  if (
    authUser.authProvider === "demo" &&
    authUser.email === DEMO_ADMIN_EMAIL &&
    workflowUser.role !== "ADMIN"
  ) {
    await database
      .prepare(
        "UPDATE users SET role = 'ADMIN', updated_at = ? WHERE id = ?",
      )
      .bind(Date.now(), workflowUser.id)
      .run();
    workflowUser.role = "ADMIN";
  } else if (
    authUser.authProvider === "demo" &&
    workflowUser.role === "MEMBER"
  ) {
    await database
      .prepare(
        "UPDATE users SET role = 'DEMO_MEMBER', updated_at = ? WHERE id = ? AND role = 'MEMBER'",
      )
      .bind(Date.now(), workflowUser.id)
      .run();
    workflowUser.role = "DEMO_MEMBER";
  }

  return { authUser, database, workflowUser };
}

export async function loadMemberDashboard(
  authUser: CurrentUser,
): Promise<UserDashboard> {
  const context = await ensureMemberContext(authUser);
  return getUserDashboard(context.database, context.workflowUser.id);
}

export async function requireApiMember(
  request: Request,
  returnTo: string,
): Promise<
  | { context: MemberContext; response?: never }
  | { context?: never; response: NextResponse }
> {
  const authUser = await getCurrentUser();
  if (!authUser) {
    const hostname = new URL(request.url).hostname;
    const canDemo =
      isDemoAuthEnabled() && isDemoAuthHostAllowed(hostname);
    return {
      response: NextResponse.json(
        {
          error: "로그인이 필요합니다.",
          code: "AUTH_REQUIRED",
          signInPath: `/my?return_to=${encodeURIComponent(returnTo)}`,
          loginUrl: signInPath(returnTo),
          demoLoginUrl: canDemo ? demoSignInPath(returnTo) : null,
        },
        { status: 401, headers: { "cache-control": "no-store" } },
      ),
    };
  }

  const context = await ensureMemberContext(authUser);
  if (context.workflowUser.status !== "ACTIVE") {
    return {
      response: NextResponse.json(
        { error: "사용할 수 없는 계정입니다.", code: "ACCOUNT_INACTIVE" },
        { status: 403 },
      ),
    };
  }
  return { context };
}

export async function requireApiAdmin(
  request: Request,
  returnTo = "/admin",
): Promise<
  | { context: MemberContext; response?: never }
  | { context?: never; response: NextResponse }
> {
  const member = await requireApiMember(request, returnTo);
  if (member.response) return member;
  if (member.context.workflowUser.role !== "ADMIN") {
    return {
      response: NextResponse.json(
        { error: "관리자 권한이 필요합니다.", code: "ADMIN_REQUIRED" },
        { status: 403, headers: { "cache-control": "no-store" } },
      ),
    };
  }
  return member;
}

export function validateMutationRequest(request: Request): NextResponse | null {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin !== url.origin) {
    return NextResponse.json(
      { error: "요청 출처를 확인할 수 없습니다.", code: "ORIGIN_REJECTED" },
      { status: 403 },
    );
  }
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    return NextResponse.json(
      { error: "JSON 요청만 허용됩니다.", code: "INVALID_CONTENT_TYPE" },
      { status: 415 },
    );
  }
  return null;
}

export function requestId(request: Request): string {
  const candidate = request.headers.get("x-request-id");
  return candidate && /^[A-Za-z0-9._:-]{1,128}$/.test(candidate)
    ? candidate
    : `req_${crypto.randomUUID()}`;
}

export function workflowErrorResponse(error: unknown): NextResponse {
  const message =
    error instanceof Error ? error.message : "요청을 처리할 수 없습니다.";
  const isValidation =
    error instanceof TypeError ||
    /not found|not active|between|must be one of|cannot transition|has expired|not pending/i.test(
      message,
    );
  return NextResponse.json(
    {
      error: isValidation ? message : "요청을 처리할 수 없습니다.",
      code: isValidation ? "INVALID_REQUEST" : "WORKFLOW_ERROR",
    },
    { status: isValidation ? 400 : 500 },
  );
}
