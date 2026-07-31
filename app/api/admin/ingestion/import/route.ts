import { NextResponse } from "next/server";
import { createUploadedLicensedCsvFeedConnector } from "../../../../../ingestion/licensed-csv-feed.ts";
import {
  createUploadedLicensedJsonFeedConnector,
  LICENSED_JSON_CONNECTOR_KIND,
} from "../../../../../ingestion/licensed-json-feed.ts";
import { SourcePolicyError } from "../../../../../ingestion/source-policy.ts";
import {
  getSourceManagementDetail,
  runApprovedConnectorIngestion,
} from "../../../../../db/operations.ts";
import {
  requireApiAdmin,
  validateMutationRequest,
  workflowErrorResponse,
} from "../../../../../lib/member-data";
import { getWorkflowRawStore } from "../../../../../lib/raw-store.ts";

const MAX_REQUEST_BYTES = 2_100_000;
const MAX_FEED_BYTES = 2_000_000;

export async function POST(request: Request) {
  const rejected = validateMutationRequest(request);
  if (rejected) return rejected;
  const auth = await requireApiAdmin(request, "/admin");
  if (auth.response) return auth.response;
  if (auth.context.authUser.authProvider === "demo") {
    return NextResponse.json(
      {
        error: "공개 데모 계정에서는 외부 파트너 자료를 반입할 수 없습니다.",
        code: "DEMO_IMPORT_DISABLED",
      },
      { status: 403, headers: { "cache-control": "no-store" } },
    );
  }

  try {
    const requestText = await request.text();
    if (new TextEncoder().encode(requestText).byteLength > MAX_REQUEST_BYTES) {
      throw new RangeError("Import request exceeds the approved byte limit");
    }
    const body = JSON.parse(requestText) as {
      sourceSlug?: unknown;
      feedText?: unknown;
      feedFormat?: unknown;
    };
    if (typeof body.sourceSlug !== "string") {
      throw new TypeError("sourceSlug must be a string");
    }
    if (typeof body.feedText !== "string") {
      throw new TypeError("feedText must be a string");
    }
    const feedFormat = body.feedFormat ?? "json";
    if (feedFormat !== "json" && feedFormat !== "csv") {
      throw new TypeError("feedFormat must be json or csv");
    }

    const bytes = new TextEncoder().encode(body.feedText);
    if (bytes.byteLength < 2 || bytes.byteLength > MAX_FEED_BYTES) {
      throw new RangeError("Uploaded partner feed exceeds the approved byte limit");
    }

    const source = await getSourceManagementDetail(
      auth.context.database,
      body.sourceSlug,
      auth.context.workflowUser.id,
    );
    if (
      source.connectorKind !== LICENSED_JSON_CONNECTOR_KIND ||
      !source.feedUrl
    ) {
      throw new TypeError(
        "Source is not configured for licensed partner ingestion",
      );
    }

    const connectorOptions = {
      sourceSlug: source.slug,
      feedUrl: source.feedUrl,
      allowedHosts: source.allowedHosts,
      maxRecords: source.maxRecordsPerRun,
      rawStore: await getWorkflowRawStore(),
      bytes,
    };
    const connector =
      feedFormat === "csv"
        ? createUploadedLicensedCsvFeedConnector(connectorOptions)
        : createUploadedLicensedJsonFeedConnector(connectorOptions);
    const result = await runApprovedConnectorIngestion(
      auth.context.database,
      connector,
      auth.context.workflowUser.id,
    );
    return NextResponse.json(
      { result, format: feedFormat },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: "반입 요청 형식이 올바른 JSON인지 확인해 주세요.",
          code: "INVALID_JSON",
        },
        { status: 400, headers: { "cache-control": "no-store" } },
      );
    }
    if (error instanceof SourcePolicyError) {
      return NextResponse.json(
        {
          error: "소스 이용 승인이 유효하지 않아 반입을 중단했습니다.",
          code: error.reason,
        },
        { status: 409, headers: { "cache-control": "no-store" } },
      );
    }
    return workflowErrorResponse(error);
  }
}

