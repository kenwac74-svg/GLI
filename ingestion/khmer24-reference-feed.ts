import { createHash } from "node:crypto";
import { parse } from "parse5";
import type { CollectedListingBatch, RawObjectStore } from "./contracts.ts";
import type { NormalizationInput } from "./normalize.ts";
import {
  LICENSED_JSON_REQUESTED_FIELDS,
  validateApprovedPartnerUrl,
} from "./licensed-json-feed.ts";
import type { SourceConnector } from "./source-policy.ts";

export const KHMER24_REFERENCE_CONNECTOR_KIND =
  "KHMER24_REFERENCE_SEARCH_V1";

export const KHMER24_REFERENCE_REQUESTED_FIELDS =
  LICENSED_JSON_REQUESTED_FIELDS;

const DEFAULT_MAX_BYTES = 3_000_000;
const DEFAULT_TIMEOUT_MS = 12_000;
const USER_AGENT = "GLI-Reference-Search/1.0";

type HtmlNode = {
  nodeName?: string;
  tagName?: string;
  value?: string;
  attrs?: Array<{ name: string; value: string }>;
  childNodes?: HtmlNode[];
};

export type Khmer24ReferenceConnectorOptions = {
  sourceSlug: string;
  categoryUrl: string;
  allowedHosts: readonly string[];
  maxRecords: number;
  rawStore: RawObjectStore;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  maxBytes?: number;
  timeoutMs?: number;
};

export function createKhmer24ReferenceConnector(
  options: Khmer24ReferenceConnectorOptions,
): SourceConnector<CollectedListingBatch> {
  const endpoint = validateApprovedPartnerUrl(
    options.categoryUrl,
    options.allowedHosts,
    "categoryUrl",
  );
  if (!/^\/(?:km|en)\/c-property-housing-rentals\/?$/.test(endpoint.pathname)) {
    throw new RangeError("categoryUrl must target the Khmer24 property category");
  }
  const maxRecords = positiveInteger(options.maxRecords, "maxRecords", 100);
  const maxBytes = positiveInteger(
    options.maxBytes ?? DEFAULT_MAX_BYTES,
    "maxBytes",
    10_000_000,
  );
  const timeoutMs = positiveInteger(
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    "timeoutMs",
    30_000,
  );
  if (!options.rawStore || typeof options.rawStore.put !== "function") {
    throw new TypeError("rawStore must expose put()");
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => new Date());

  return {
    sourceSlug: options.sourceSlug,
    connectorKind: KHMER24_REFERENCE_CONNECTOR_KIND,
    endpoint: endpoint.toString(),
    requestedFields: KHMER24_REFERENCE_REQUESTED_FIELDS,
    async collect() {
      const fetchedAt = validNow(now()).getTime();
      const robotsUrl = new URL("/robots.txt", endpoint);
      const robotsResponse = await fetchImpl(robotsUrl, {
        headers: { accept: "text/plain", "user-agent": USER_AGENT },
        redirect: "error",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!robotsResponse.ok) {
        throw new Error(`Khmer24 robots policy returned HTTP ${robotsResponse.status}`);
      }
      const robotsText = await robotsResponse.text();
      assertReferenceSearchAllowed(robotsText, endpoint.pathname);

      const response = await fetchImpl(endpoint, {
        headers: { accept: "text/html", "user-agent": USER_AGENT },
        redirect: "error",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.status === 403 || response.status === 429) {
        throw new Error(
          "Khmer24 refused automated collection; partner allowlisting or an authorized feed is required",
        );
      }
      if (!response.ok) {
        throw new Error(`Khmer24 category returned HTTP ${response.status}`);
      }
      const contentType = response.headers.get("content-type") ?? "";
      if (!/^text\/html(?:\s*;|$)/i.test(contentType)) {
        throw new Error("Khmer24 category must return text/html");
      }

      const declaredLength = Number(response.headers.get("content-length"));
      if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
        throw new RangeError("Khmer24 response exceeds the approved byte limit");
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength > maxBytes) {
        throw new RangeError("Khmer24 response exceeds the approved byte limit");
      }

      const contentHash = sha256(bytes);
      const sourceUrlHash = sha256(new TextEncoder().encode(endpoint.toString()));
      const objectKey = [
        "raw",
        options.sourceSlug,
        new Date(fetchedAt).toISOString().slice(0, 10),
        `${contentHash}.html`,
      ].join("/");
      const html = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      const candidates = parseKhmer24ReferenceHtml(
        html,
        endpoint,
        new Date(fetchedAt),
        maxRecords,
      );
      if (candidates.length === 0) {
        throw new RangeError("Khmer24 category contained no supported complete listings");
      }

      await options.rawStore.put(objectKey, bytes, {
        httpMetadata: { contentType: "text/html; charset=utf-8" },
        customMetadata: {
          sourceSlug: options.sourceSlug,
          contentHash,
          fetchedAt: String(fetchedAt),
          collectionMode: "reference-search",
        },
      });

      return {
        candidates,
        snapshot: {
          sourceUrl: endpoint.toString(),
          sourceUrlHash,
          contentHash,
          objectKey,
          httpStatus: response.status,
          fetchedAt,
        },
      };
    },
  };
}

export function parseKhmer24ReferenceHtml(
  html: string,
  endpoint: URL,
  observedAt: Date,
  maxRecords = 100,
): NormalizationInput[] {
  if (typeof html !== "string" || html.length < 100) {
    throw new TypeError("html must be a non-empty Khmer24 document");
  }
  const document = parse(html) as unknown as HtmlNode;
  const anchors = descendants(document).filter(
    (node) => node.tagName === "a" && /(?:^|\s)post(?:\s|$)/.test(attribute(node, "class") ?? ""),
  );
  const results: NormalizationInput[] = [];

  for (const anchor of anchors) {
    if (results.length >= maxRecords) break;
    const href = attribute(anchor, "href");
    const externalId = href?.match(/-adid-(\d+)(?:[/?#]|$)/)?.[1];
    if (!href || !externalId) continue;

    const title = text(findByClass(anchor, "title"));
    const image = descendants(anchor).find((node) => node.tagName === "img");
    const imageSrc = image ? attribute(image, "src") : null;
    const locationBlock = findByClass(anchor, "date-location");
    const detailLines = (locationBlock?.childNodes ?? [])
      .filter((node) => node.tagName === "p")
      .map((node) => text(node));
    const location = detailLines[0]?.split("•").at(-1)?.trim() ?? "";
    const details = detailLines[1] ?? "";
    const priceText = descendants(anchor)
      .filter((node) => node.tagName === "strong")
      .map((node) => text(node))
      .find((value) => value.includes("$"));
    const price = decimal(priceText?.match(/\$\s*([\d,]+(?:\.\d{1,2})?)/)?.[1]);
    const areaSqm = decimal(details.match(/([\d,.]+)\s*m(?:²|2)/i)?.[1]);
    const bedrooms = integer(
      details.match(/(?:Bedroom|Bedrooms|បន្ទប់គេង)\s*(\d+)/i)?.[1],
    );
    const bathrooms = integer(
      details.match(/(?:Bathroom|Bathrooms|បន្ទប់ទឹក)\s*(\d+)/i)?.[1],
    );
    const transaction = transactionFrom(details);
    const propertyType = propertyTypeFrom(`${href} ${title}`);
    const place = placeFrom(location);

    if (
      !title ||
      !imageSrc ||
      !price ||
      !areaSqm ||
      bedrooms === null ||
      bathrooms === null ||
      !transaction ||
      !propertyType ||
      !place
    ) {
      continue;
    }

    results.push({
      country: "Cambodia",
      city: place.city,
      district: place.district,
      transaction,
      propertyType,
      price,
      currency: "USD",
      areaSqm,
      bedrooms,
      bathrooms,
      imageUrl: new URL(imageSrc, endpoint).toString(),
      title,
      summary: `Public marketplace reference in ${place.district}, ${place.city}. ${propertyType}, ${transaction}, ${areaSqm} sqm.`,
      sourceExternalKey: externalId,
      sourceUrl: new URL(href, endpoint).toString(),
      observedAt: validNow(observedAt).toISOString(),
    });
  }

  return results;
}

export function assertReferenceSearchAllowed(
  robotsText: string,
  pathname: string,
): void {
  if (typeof robotsText !== "string" || typeof pathname !== "string") {
    throw new TypeError("robotsText and pathname must be strings");
  }
  const lines = robotsText.split(/\r?\n/).map((line) => line.replace(/\s+#.*$/, "").trim());
  let applies = false;
  let searchAllowed = false;
  let referenceOnly = false;
  const disallowed: string[] = [];

  for (const line of lines) {
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLocaleLowerCase("en-US");
    const value = line.slice(separator + 1).trim();
    if (key === "user-agent") {
      applies = value === "*";
      continue;
    }
    if (!applies) continue;
    if (key === "content-signal") {
      const signals = new Map(
        value.split(",").map((entry) => {
          const [name, signalValue] = entry.split("=").map((part) => part.trim());
          return [name, signalValue];
        }),
      );
      searchAllowed ||= signals.get("search") === "yes";
      referenceOnly ||= signals.get("use") === "reference";
    } else if (key === "disallow" && value) {
      disallowed.push(value);
    }
  }

  if (!searchAllowed || !referenceOnly) {
    throw new Error("Khmer24 robots policy does not allow reference search");
  }
  if (disallowed.some((prefix) => pathname.startsWith(prefix))) {
    throw new Error("Khmer24 robots policy disallows the configured category");
  }
}

function descendants(node: HtmlNode): HtmlNode[] {
  const found: HtmlNode[] = [];
  const stack = [...(node.childNodes ?? [])];
  while (stack.length > 0) {
    const current = stack.shift();
    if (!current) continue;
    found.push(current);
    stack.unshift(...(current.childNodes ?? []));
  }
  return found;
}

function attribute(node: HtmlNode, name: string): string | null {
  return node.attrs?.find((item) => item.name === name)?.value ?? null;
}

function findByClass(node: HtmlNode, className: string): HtmlNode | undefined {
  return descendants(node).find((candidate) =>
    (attribute(candidate, "class") ?? "").split(/\s+/).includes(className),
  );
}

function text(node: HtmlNode | undefined): string {
  if (!node) return "";
  const value = node.nodeName === "#text" ? node.value ?? "" : "";
  return `${value}${(node.childNodes ?? []).map((child) => text(child)).join("")}`
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ");
}

function decimal(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value.replaceAll(",", ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function integer(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 100 ? parsed : null;
}

function transactionFrom(value: string): "sale" | "rent" | null {
  if (/\bRent\b|ជួល/i.test(value)) return "rent";
  if (/\bSale\b|លក់/i.test(value)) return "sale";
  return null;
}

function propertyTypeFrom(value: string): "condo" | "house" | "villa" | null {
  if (/condo|apartment|ខុនដូ|អាផាតមិន/i.test(value)) return "condo";
  if (/villa|វីឡា/i.test(value)) return "villa";
  if (/house|home|room|ផ្ទះ|បុរី/i.test(value)) return "house";
  return null;
}

function placeFrom(value: string): { city: string; district: string } | null {
  const parts = value.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const district = translatePlace(parts[0]);
  const city = translatePlace(parts.at(-1) ?? "");
  return district && city ? { city, district } : null;
}

const PLACE_TRANSLATIONS: Record<string, string> = {
  "ភ្នំពេញ": "Phnom Penh",
  "សៀមរាប": "Siem Reap",
  "ព្រះសីហនុ": "Preah Sihanouk",
  "កណ្ដាល": "Kandal",
  "កណ្តាល": "Kandal",
  "បឹងកេងកង": "Boeng Keng Kang",
  "ចំការមន": "Chamkar Mon",
  "ច្បារអំពៅ": "Chbar Ampov",
  "ដង្កោ": "Dangkao",
  "ដូនពេញ": "Doun Penh",
  "កំបូល": "Kamboul",
  "មានជ័យ": "Mean Chey",
  "ពោធិ៍សែនជ័យ": "Por Senchey",
  "ព្រែកព្នៅ": "Prek Pnov",
  "ឫស្សីកែវ": "Russey Keo",
  "សែនសុខ": "Sen Sok",
  "ទួលគោក": "Tuol Kouk",
  "ជ្រោយចង្វារ": "Chroy Changvar",
  "៧មករា": "Prampir Makara",
};

function translatePlace(value: string): string {
  return PLACE_TRANSLATIONS[value] ?? value;
}

function positiveInteger(value: number, field: string, maximum: number): number {
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
