import { exportAuditCsv } from "../../../../../db/audit-log";
import {
  requireApiAdmin,
  workflowErrorResponse,
} from "../../../../../lib/member-data";

export async function GET(request: Request) {
  const authorization = await requireApiAdmin(request, "/admin/audit");
  if (authorization.response) return authorization.response;

  try {
    const url = new URL(request.url);
    const exported = await exportAuditCsv(
      authorization.context.database,
      authorization.context.workflowUser.id,
      { category: url.searchParams.get("category") },
    );
    const date = new Date(exported.to).toISOString().slice(0, 10);
    return new Response(exported.csv, {
      headers: {
        "cache-control": "no-store",
        "content-disposition": `attachment; filename="gli-audit-${date}.csv"`,
        "content-type": "text/csv; charset=utf-8",
        "x-content-type-options": "nosniff",
        "x-gli-audit-rows": String(exported.rowCount),
        "x-gli-audit-truncated": String(exported.truncated),
      },
    });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}

