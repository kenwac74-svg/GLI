import { createHash } from "node:crypto";
import type { CollectedListingBatch, RawObjectStore } from "./contracts.ts";
import {
  LICENSED_JSON_CONNECTOR_KIND,
  LICENSED_JSON_REQUESTED_FIELDS,
  toLicensedPartnerNormalizationInput,
  validateApprovedPartnerUrl,
} from "./licensed-json-feed.ts";
import type { SourceConnector } from "./source-policy.ts";

const DEFAULT_MAX_BYTES = 2_000_000;
const UTF8_BOM = "\uFEFF";

export type UploadedLicensedCsvFeedOptions = {
  sourceSlug: string;
  feedUrl: string;
  allowedHosts: readonly string[];
  maxRecords: number;
  rawStore: RawObjectStore;
  bytes: Uint8Array;
  now?: () => Date;
  maxBytes?: number;
};

export function createUploadedLicensedCsvFeedConnector(
  options: UploadedLicensedCsvFeedOptions,
): SourceConnector<CollectedListingBatch> {
  const endpoint = validateApprovedPartnerUrl(
    options.feedUrl,
    options.allowedHosts,
    "feedUrl",
  );
  const maxRecords = validatePositiveInteger(
    options.maxRecords,
    "maxRecords",
    1_000,
  );
  const maxBytes = validatePositiveInteger(
    options.maxBytes ?? DEFAULT_MAX_BYTES,
    "maxBytes",
    10_000_000,
  );
  if (!options.rawStore || typeof options.rawStore.put !== "function") {
    throw new TypeError("rawStore must expose put()");
  }
  if (!(options.bytes instanceof Uint8Array)) {
    throw new TypeError("bytes must be a Uint8Array");
  }
  if (options.bytes.byteLength < 2 || options.bytes.byteLength > maxBytes) {
    throw new RangeError("Uploaded partner feed exceeds the approved byte limit");
  }

  const now = options.now ?? (() => new Date());
  return {
    sourceSlug: options.sourceSlug,
    connectorKind: LICENSED_JSON_CONNECTOR_KIND,
    endpoint: endpoint.toString(),
    requestedFields: LICENSED_JSON_REQUESTED_FIELDS,
    async collect() {
      const fetchedAt = validNow(now()).getTime();
      const contentHash = sha256(options.bytes);
      const sourceUrlHash = sha256(
        new TextEncoder().encode(endpoint.toString()),
      );
      const objectKey = [
        "raw",
        options.sourceSlug,
        new Date(fetchedAt).toISOString().slice(0, 10),
        `${contentHash}.csv`,
      ].join("/");
      const records = parseLicensedCsv(options.bytes, maxRecords);

      await options.rawStore.put(objectKey, options.bytes, {
        httpMetadata: { contentType: "text/csv; charset=utf-8" },
        customMetadata: {
          sourceSlug: options.sourceSlug,
          contentHash,
          fetchedAt: String(fetchedAt),
          collectionMode: "manual-upload",
          feedFormat: "csv",
        },
      });

      return {
        candidates: records.map((record) =>
          toLicensedPartnerNormalizationInput(record, options.allowedHosts),
        ),
        snapshot: {
          sourceUrl: endpoint.toString(),
          sourceUrlHash,
          contentHash,
          objectKey,
          httpStatus: 200,
          fetchedAt,
        },
      };
    },
  };
}

export function parseLicensedCsv(
  bytes: Uint8Array,
  maxRecords: number,
): Record<string, unknown>[] {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new TypeError("Partner CSV must be valid UTF-8");
  }
  if (text.startsWith(UTF8_BOM)) text = text.slice(1);

  const rows = parseRfc4180(text, maxRecords + 1);
  if (rows.length < 2) {
    throw new RangeError("Partner CSV must contain a header and at least one listing");
  }

  const headers = rows[0];
  const expectedHeaders = new Set<string>(LICENSED_JSON_REQUESTED_FIELDS);
  const seenHeaders = new Set<string>();
  for (const header of headers) {
    if (!expectedHeaders.has(header)) {
      throw new RangeError(`Partner CSV contains an unsupported header: ${header}`);
    }
    if (seenHeaders.has(header)) {
      throw new RangeError(`Partner CSV contains a duplicate header: ${header}`);
    }
    seenHeaders.add(header);
  }
  const missing = LICENSED_JSON_REQUESTED_FIELDS.filter(
    (header) => !seenHeaders.has(header),
  );
  if (missing.length > 0) {
    throw new RangeError(
      `Partner CSV is missing required headers: ${missing.join(", ")}`,
    );
  }

  const records = rows.slice(1);
  if (records.length > maxRecords) {
    throw new RangeError("Partner feed exceeds the approved record limit");
  }

  return records.map((row, rowIndex) => {
    if (row.length !== headers.length) {
      throw new RangeError(
        `Partner CSV row ${rowIndex + 2} has ${row.length} columns; expected ${headers.length}`,
      );
    }
    const value = Object.fromEntries(
      headers.map((header, index) => [header, row[index]]),
    ) as Record<string, unknown>;
    value.price = parseDecimal(value.price, "price", rowIndex + 2);
    value.areaSqm = parseDecimal(value.areaSqm, "areaSqm", rowIndex + 2);
    value.bedrooms = parseInteger(value.bedrooms, "bedrooms", rowIndex + 2);
    value.bathrooms = parseInteger(value.bathrooms, "bathrooms", rowIndex + 2);
    if (value.imageUrl === "") value.imageUrl = null;
    return value;
  });
}

function parseRfc4180(text: string, rowLimit: number): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let quoteClosed = false;

  function finishField() {
    row.push(field);
    field = "";
    quoteClosed = false;
  }

  function finishRow() {
    finishField();
    rows.push(row);
    row = [];
    if (rows.length > rowLimit) {
      throw new RangeError("Partner feed exceeds the approved record limit");
    }
  }

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
          quoteClosed = true;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (quoteClosed && character !== "," && character !== "\r" && character !== "\n") {
      throw new TypeError("Partner CSV has characters after a closing quote");
    }
    if (character === '"') {
      if (field !== "") {
        throw new TypeError("Partner CSV contains a quote inside an unquoted field");
      }
      quoted = true;
    } else if (character === ",") {
      finishField();
    } else if (character === "\r" || character === "\n") {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      finishRow();
    } else {
      field += character;
    }
  }

  if (quoted) {
    throw new TypeError("Partner CSV contains an unterminated quoted field");
  }
  if (field !== "" || row.length > 0 || quoteClosed) finishRow();
  if (rows.at(-1)?.every((value) => value === "")) rows.pop();
  return rows;
}

function parseDecimal(value: unknown, field: string, row: number): number {
  if (
    typeof value !== "string" ||
    !/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value)
  ) {
    throw new TypeError(`Partner CSV ${field} on row ${row} must be a decimal number`);
  }
  return Number(value);
}

function parseInteger(value: unknown, field: string, row: number): number {
  if (typeof value !== "string" || !/^(?:0|[1-9]\d*)$/.test(value)) {
    throw new TypeError(`Partner CSV ${field} on row ${row} must be an integer`);
  }
  return Number(value);
}

function validatePositiveInteger(
  value: number,
  field: string,
  maximum: number,
): number {
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    throw new RangeError(`${field} must be an integer between 1 and ${maximum}`);
  }
  return value;
}

function validNow(value: Date): Date {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new TypeError("now must return a valid Date");
  }
  return value;
}

function sha256(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}
