import { parse } from "parse5";
import { createHash } from "node:crypto";
import type { Asset } from "./assets.ts";
import { convertCurrency } from "./currency.ts";
import { getExchangeRates } from "./exchange-rates.ts";
import { assertRobotsPathAllowed } from "../ingestion/wordpress-property-feed.ts";
import { isDemoSourceAutoApprovalEnabled } from "./demo-data-mode.ts";

// GLI-SPEC: GS-005/P45. User approved bounded Dot Property demo reuse; project
// references are deferred until the user resumes the enrichment phase.
// User-approved demo collection is not a provider licence for commercial use.
export type VietnamProjectReference = {
  id: string;
  sourceName: "ERA Vietnam";
  sourceUrl: string;
  country: "Vietnam";
  kind: "project";
  title: string;
  location: string | null;
  tags: string[];
  developerClaim: string | null;
  ownershipClaim: string | null;
  projectAreaText: string | null;
  scaleText: string | null;
  progressClaim: string | null;
  publishedAt: string | null;
  sourceUpdatedAt: string | null;
  observedAt: string;
  unitPrice: null;
  monthlyRent: null;
  netMonthlyIncome: null;
};

type SourceState = {
  name: "ERA Vietnam" | "Batdongsan.com.vn" | "Dot Property Vietnam" | "Homedy";
  status: "collected" | "blocked" | "unavailable" | "mapping_required" | "disabled";
  count: number;
  reason?: string;
};
export type VietnamDiscoveryResult = {
  demoOnly: true;
  checkedAt: string;
  cached: boolean;
  projects: VietnamProjectReference[];
  assets: Asset[];
  sources: SourceState[];
};

type HtmlNode = {
  tagName?: string;
  nodeName?: string;
  value?: string;
  childNodes?: HtmlNode[];
  attrs?: { name: string; value: string }[];
};
type Options = {
  refresh?: boolean;
  enabled?: boolean;
  fetchImpl?: typeof fetch;
  now?: () => Date;
};
const ERA_LIST = "https://era.com.vn/du-an/";
const BAT_LIST = "https://batdongsan.com.vn/ban-can-ho-chung-cu-tp-hcm";
type SourceSelection = { name: SourceState["name"]; endpoint: string; firstReviewPassed: boolean; reason: string };
// Demo acceptance is not commercial permission. Homedy mapping is held after
// response timeouts; auxiliary sources and the blocked portal stay deferred.
const SOURCE_SELECTION: readonly SourceSelection[] = [
  { name: "ERA Vietnam", endpoint: ERA_LIST, firstReviewPassed: false, reason: "auxiliary_deferred_P44" },
  { name: "Batdongsan.com.vn", endpoint: BAT_LIST, firstReviewPassed: false, reason: "access_blocked_HTTP_403" },
  { name: "Dot Property Vietnam", endpoint: "https://www.dotproperty.com.vn/en/condos-for-sale", firstReviewPassed: true, reason: "demo_reuse_approved_P45" },
  { name: "Homedy", endpoint: "https://homedy.com/", firstReviewPassed: false, reason: "listing_mapping_timeout" },
];
const LIMIT_BYTES = 2_000_000;
const TIMEOUT_MS = 12_000;
let cache: { expiresAt: number; result: VietnamDiscoveryResult } | null = null;
let pending: Promise<VietnamDiscoveryResult> | null = null;
const liveAssets = new Map<string, Asset>();

export function findLiveVietnamAsset(id: string): Asset | null { return liveAssets.get(id) ?? null; }

export function isVietnamDemoEnabled(env: Record<string, string | undefined> = process.env): boolean {
  if (env.NODE_ENV === "development" && (!env.DEPLOYMENT_STAGE || env.DEPLOYMENT_STAGE === "development")) return true;
  if (env.DEPLOYMENT_STAGE) return isDemoSourceAutoApprovalEnabled(env);
  return false;
}

export function isVietnamLocalRuntime(requestUrl: string, deploymentStage: string | undefined): boolean {
  if (deploymentStage !== "development") return false;
  try { return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(requestUrl).hostname); }
  catch { return false; }
}

export async function isVietnamDemoRequestEnabled(requestUrl: string): Promise<boolean> {
  let enabled = isVietnamDemoEnabled();
  if (!enabled && (!process.env.DEPLOYMENT_STAGE || ["demo", "development"].includes(process.env.DEPLOYMENT_STAGE))) {
    const runtime = await import("cloudflare:workers").catch(() => null);
    if (runtime) enabled = isDemoSourceAutoApprovalEnabled({
      DEPLOYMENT_STAGE: runtime.env.DEPLOYMENT_STAGE, DEMO_SOURCE_AUTO_APPROVAL: runtime.env.DEMO_SOURCE_AUTO_APPROVAL,
    }) || isVietnamLocalRuntime(requestUrl, runtime.env.DEPLOYMENT_STAGE);
  }
  return enabled;
}

export async function discoverVietnamReferences(options: Options = {}): Promise<VietnamDiscoveryResult> {
  const now = options.now?.() ?? new Date();
  if (!options.enabled) return {
    demoOnly: true, checkedAt: now.toISOString(), cached: false, projects: [], assets: [],
    sources: SOURCE_SELECTION.map(({ name }) => ({
      name, status: "disabled", count: 0, reason: "demo_only",
    })),
  };
  // Injected fetch/clock are isolated from runtime cache (tests and diagnostics).
  const useCache = !options.fetchImpl && !options.now;
  if (useCache && cache && cache.expiresAt > now.getTime() && (!options.refresh || cache.result.assets.length === 0)) return { ...cache.result, cached: true };
  if (useCache && pending) return pending;
  const job = collect(options.fetchImpl ?? fetch, now);
  if (!useCache) return job;
  pending = job;
  try {
    const result = await job;
    cache = { result, expiresAt: Date.now() + (result.assets.length ? 600_000 : 60_000) };
    for (const asset of result.assets) liveAssets.set(asset.id, asset);
    while (liveAssets.size > 120) liveAssets.delete(liveAssets.keys().next().value!);
    return result;
  } finally { pending = null; }
}

async function collect(fetchImpl: typeof fetch, now: Date): Promise<VietnamDiscoveryResult> {
  const projects: VietnamProjectReference[] = [];
  const assets: Asset[] = [];
  const sources: SourceState[] = [];
  for (const { name, endpoint, firstReviewPassed, reason } of SOURCE_SELECTION) {
    if (!firstReviewPassed) {
      sources.push({ name, status: "disabled", count: 0, reason });
      continue;
    }
    try {
      const robots = await readPublicPage(new URL("/robots.txt", endpoint), fetchImpl, true);
      if (name === "Dot Property Vietnam") assertVietnamRobotsAllowed(robots, new URL(endpoint).pathname);
      else assertRobotsPathAllowed(robots, new URL(endpoint).pathname);
      const html = await readPublicPage(new URL(endpoint), fetchImpl);
      if (name === "ERA Vietnam") {
        const references = parseEraProjects(html, now);
        if (!references.length) throw new Error("no_supported_project_data");
        projects.push(...references);
        sources.push({ name, status: "collected", count: references.length });
      } else if (name === "Dot Property Vietnam") {
        // One page each, no per-unit requests, pagination, contact forms or AI.
        for (const transaction of ["sale", "rent"] as const) {
          const url = new URL(`/en/condos-for-${transaction}`, endpoint);
          assertVietnamRobotsAllowed(robots, url.pathname);
          const page = transaction === "sale" ? html : await readPublicPage(url, fetchImpl);
          assets.push(...parseDotPropertyListings(page, transaction, now));
        }
        if (!assets.length) throw new Error("no_supported_listing_data");
        sources.push({ name, status: "collected", count: assets.length });
      } else {
        // New listing sources also need a verified field map before admission.
        sources.push({ name, status: "mapping_required", count: 0, reason: "listing_mapping_not_verified" });
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : "collection_failed";
      const partial = name === "Dot Property Vietnam" ? assets.length : 0;
      sources.push({ name, status: partial ? "collected" : /HTTP_403|HTTP_429|robots policy/.test(reason) ? "blocked" : "unavailable", count: partial, reason: partial ? `partial_collection:${reason}` : reason });
    }
  }
  if (assets.length) {
    const rates = await getExchangeRates(fetchImpl);
    if (rates && !rates.stale) for (const asset of assets) {
      const amount = convertCurrency(asset.price, asset.currency, "USD", rates.snapshot.rates);
      if (amount !== null) asset.priceUsdReference = { amount, provider: rates.snapshot.provider, asOf: rates.snapshot.updatedAt };
    }
  }
  return { demoOnly: true, checkedAt: now.toISOString(), cached: false, projects, assets, sources };
}

export async function readPublicPage(url: URL, fetchImpl: typeof fetch, robots = false): Promise<string> {
  if (url.protocol !== "https:" || !["era.com.vn", "batdongsan.com.vn", "www.dotproperty.com.vn", "www.dotproperty.com.ph"].includes(url.hostname)) {
    throw new Error("source_host_not_allowed");
  }
  const response = await fetchImpl(url, {
    headers: { accept: robots ? "text/plain" : "text/html", "user-agent": "GLI-Reference-Search/1.0" },
    redirect: "manual", credentials: "omit", signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok || response.status >= 300) throw new Error(`HTTP_${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!robots && !/^text\/html(?:\s*;|$)/i.test(contentType)) throw new Error("unexpected_content_type");
  const max = robots ? 64_000 : url.hostname === "www.dotproperty.com.ph" ? 3_000_000 : LIMIT_BYTES;
  const declared = Number(response.headers.get("content-length"));
  if (declared > max) throw new Error("response_too_large");
  if (!response.body) throw new Error("empty_response");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > max) { await reader.cancel(); throw new Error("response_too_large"); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (robots && !/user-agent\s*:/i.test(text)) throw new Error("invalid_robots_policy");
  return text;
}

export function parseDotPropertyListings(html: string, transaction: Asset["transaction"], observedAt: Date, market: "Vietnam" | "Philippines" = "Vietnam"): Asset[] {
  const philippines = market === "Philippines";
  const host = philippines ? "www.dotproperty.com.ph" : "www.dotproperty.com.vn";
  const adsPath = philippines ? "/ads/" : "/en/ads/";
  const document = parse(html) as unknown as HtmlNode;
  const results = new Map<string, Asset>();
  for (const card of nodes(document, node => node.tagName === "article" && hasClass(node, "listing-snippet")).slice(0, 30)) {
    const titleNode = nodes(card, node => node.tagName === "div" && hasClass(node, "sm:truncate") && Boolean(attr(node, "title")))[0];
    const title = titleNode ? publicText(attr(titleNode, "title"), 250) : null;
    const transactionPattern = philippines ? `Condo for (?:${transaction}|Sale or Rent)` : `Condo for ${transaction}`;
    if (!title || !new RegExp(transactionPattern, "i").test(title) || /\+?\d[\d ().-]{7,}\d/.test(title)) continue;
    const link = nodes(card, node => node.tagName === "a" && (attr(node, "href") ?? "").includes(adsPath))[0];
    let sourceUrl: URL;
    try { sourceUrl = new URL(attr(link, "href") ?? ""); } catch { continue; }
    if (sourceUrl.protocol !== "https:" || sourceUrl.hostname !== host || !new RegExp(`^${adsPath}[^/]+$`).test(sourceUrl.pathname)) continue;
    sourceUrl.search = ""; sourceUrl.hash = "";
    const priceNode = nodes(card, node => node.tagName === "div" && hasClass(node, "text-3xl") && hasClass(node, "text-secondary-base"))[0];
    const priceText = textOf(priceNode);
    const phpPrice = priceText.match(/^₱\s*([\d,]+(?:\.\d+)?)\s*(?:\/\s*month)?$/i);
    const price = philippines ? (phpPrice ? Number(phpPrice[1].replaceAll(",", "")) : null) : dotPrice(priceText);
    const locationNode = nodes(card, node => node.tagName === "div" && hasClass(node, "my-[5px]"))[0];
    const location = textOf(locationNode).split(",").map(part => part.trim());
    const city = philippines ? ({ "Cebu City": "Cebu" } as Record<string, string>)[location[0]] ?? location[0]
      : ({ "Ho Chi Minh": "Ho Chi Minh City", "Ha Noi": "Hanoi", "Hanoi": "Hanoi", "Da Nang": "Da Nang", "Khanh Hoa": "Khanh Hoa" } as Record<string, string>)[location.at(-1) ?? ""];
    const metric = (icon: string) => {
      const li = nodes(card, node => node.tagName === "li" && nodes(node, child => child.tagName === "img" && (attr(child, "src") ?? "").includes(`/assets/${icon}-`)).length > 0)[0];
      const number = Number(textOf(li).match(/^\s*(\d+(?:\.\d+)?)/)?.[1]);
      return Number.isFinite(number) ? number : null;
    };
    const bedrooms = metric("bed"), bathrooms = metric("bathtub"), areaSqm = metric("resize");
    if (!price || !Number.isFinite(price) || price <= 0 || !city || bedrooms === null || bathrooms === null || areaSqm === null || areaSqm <= 0) continue;
    const image = nodes(card, node => node.tagName === "img" && (attr(node, "src") ?? "").startsWith("https://pix.dotproperty.co.th/"))[0];
    const imageUrl = attr(image, "src");
    if (!imageUrl) continue;
    // PH dual-purpose adverts share a URL but expose different sale/rent prices.
    const id = `GLI-${philippines ? "PH" : "VN"}-DOT-${createHash("sha256").update(sourceUrl.toString() + (philippines ? `:${transaction}` : "")).digest("hex").slice(0, 12).toUpperCase()}`;
    results.set(id, {
      id, country: market, countryCode: philippines ? "PH" : "VN", city, district: (philippines ? location.slice(1) : location.slice(0, -1)).join(", "),
      transaction, propertyType: "condo", assetCategory: "residential", bedrooms, bathrooms, areaSqm,
      title, price, currency: philippines ? "PHP" : "VND", image: imageUrl, summary: title,
      trustScore: 0, trustStatus: "PRELIMINARY", isGliDirect: false,
      sourceName: `Dot Property ${market}`, sourceUrl: sourceUrl.toString(),
      // The listing card supplies no original timestamp. Never invent one from
      // collection time; explicit facts avoid rendering an invalid date.
      updatedAt: "", sourceObservedAt: observedAt.toISOString(),
      publicationBasis: sourceUrl.toString(), documentDateLabel: "조사 예정",
      detailFacts: [{ label: "면적", value: `${areaSqm}㎡` }, { label: "침실", value: bedrooms ? String(bedrooms) : "Studio" }, { label: "욕실", value: String(bathrooms) }],
      strengths: [], checks: ["실제 거래 가능 여부 조사 예정", "소유권 및 외국인 취득 가능 여부 조사 예정", "해당 호실의 임대계약·운영비·순수익 조사 예정"],
    });
  }
  return [...results.values()].slice(0, 20);
}

function nodes(root: HtmlNode | undefined, predicate: (node: HtmlNode) => boolean): HtmlNode[] {
  if (!root) return [];
  const found = predicate(root) ? [root] : [];
  for (const child of root.childNodes ?? []) found.push(...nodes(child, predicate));
  return found;
}
function attr(node: HtmlNode | undefined, name: string): string | undefined { return node?.attrs?.find(value => value.name === name)?.value; }
function hasClass(node: HtmlNode, name: string): boolean { return (attr(node, "class") ?? "").split(/\s+/).includes(name); }
function textOf(node: HtmlNode | undefined): string {
  if (!node || ["script", "style", "svg"].includes(node.tagName ?? "")) return "";
  return (node.value ?? (node.childNodes ?? []).map(textOf).join(" ")).replace(/\s+/g, " ").trim();
}
function dotPrice(text: string): number | null {
  const match = text.match(/^₫\s*([\d,]+(?:\.\d+)?)\s*(billion|million)?\s*(?:\/\s*month)?$/i);
  if (!match) return null;
  const amount = Number(match[1].replaceAll(",", "")) * (match[2]?.toLowerCase() === "billion" ? 1e9 : match[2]?.toLowerCase() === "million" ? 1e6 : 1);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

// Match this collector's identity, wildcard paths and Allow precedence, rather
// than treating another bot's permissions as permission for GLI.
export function assertVietnamRobotsAllowed(robots: string, path: string): void {
  const groups: { agents: string[]; rules: { allow: boolean; path: string }[] }[] = [];
  let group = { agents: [] as string[], rules: [] as { allow: boolean; path: string }[] };
  for (const line of robots.split(/\r?\n/)) {
    const clean = line.split("#")[0].trim();
    const colon = clean.indexOf(":");
    if (colon < 0) continue;
    const key = clean.slice(0, colon).trim().toLowerCase(), value = clean.slice(colon + 1).trim();
    if (key === "user-agent") {
      if (group.rules.length) { groups.push(group); group = { agents: [], rules: [] }; }
      group.agents.push(value.toLowerCase());
    } else if (group.agents.length && ["allow", "disallow"].includes(key) && value) group.rules.push({ allow: key === "allow", path: value });
  }
  groups.push(group);
  const agent = "gli-reference-search";
  const length = (group: typeof groups[number]) => Math.max(-1, ...group.agents.map(value => value === "*" ? 0 : agent.includes(value) ? value.length : -1));
  const longest = Math.max(-1, ...groups.map(length));
  if (longest < 0) return;
  const matches = groups.filter(group => length(group) === longest).flatMap(group => group.rules).filter(rule => {
    const pattern = rule.path.replace(/[.+?^{}()|[\]\\]/g, "\\$&").replaceAll("*", ".*");
    return new RegExp(`^${pattern}`).test(path);
  }).sort((a, b) => b.path.replaceAll("*", "").length - a.path.replaceAll("*", "").length || Number(b.allow) - Number(a.allow));
  if (matches[0] && !matches[0].allow) throw new Error("Source robots policy disallows the configured listing path");
}

export function parseEraProjects(html: string, observedAt: Date): VietnamProjectReference[] {
  const document = parse(html) as unknown as HtmlNode;
  const scripts: HtmlNode[] = [];
  const visit = (node: HtmlNode) => {
    if (node.tagName === "script") scripts.push(node);
    for (const child of node.childNodes ?? []) visit(child);
  };
  visit(document);
  const results = new Map<string, VietnamProjectReference>();
  for (const script of scripts) {
    const text = (script.childNodes ?? []).map(node => node.value ?? "").join("").trim();
    const prefix = "self.__next_f.push(";
    if (!text.startsWith(prefix) || !text.endsWith(")")) continue;
    // Decode only the public JSON payload; never execute source JavaScript.
    let chunk: unknown;
    try { chunk = JSON.parse(text.slice(prefix.length, -1)); } catch { continue; }
    if (!Array.isArray(chunk) || chunk[0] !== 1 || typeof chunk[1] !== "string") continue;
    for (const row of chunk[1].split("\n")) {
      if (!row.includes('"initialProjects"')) continue;
      let value: unknown;
      try { value = JSON.parse(row.slice(row.indexOf(":") + 1)); } catch { continue; }
      const props = Array.isArray(value) ? value[3] : null;
      if (!isRecord(props) || !Array.isArray(props.initialProjects)) continue;
      for (const raw of props.initialProjects.slice(0, 20)) {
        if (!isRecord(raw) || raw.publicationStatus !== "published" || raw.deletedAt ||
          typeof raw.id !== "string" || !/^[a-z\d-]{1,80}$/i.test(raw.id) ||
          typeof raw.slug !== "string" || !/^[a-z\d-]{1,300}$/i.test(raw.slug)) continue;
        const title = publicText(raw.projectName, 250) ?? publicText(raw.name, 250);
        if (!title) continue;
        results.set(raw.id, {
          id: `ERA-VN-${raw.id}`, country: "Vietnam", kind: "project", sourceName: "ERA Vietnam",
          sourceUrl: new URL(`/du-an/${raw.slug}/`, ERA_LIST).toString(), title,
          location: publicText(raw.location), tags: Array.isArray(raw.tags)
            ? raw.tags.flatMap(tag => publicText(tag, 80) ? [publicText(tag, 80)!] : []).slice(0, 12) : [],
          developerClaim: publicText(raw.investor), ownershipClaim: publicText(raw.ownership),
          projectAreaText: publicText(raw.area), scaleText: publicText(raw.scale), progressClaim: publicText(raw.progress),
          publishedAt: dateText(raw.publishedAt), sourceUpdatedAt: dateText(raw.updatedAt),
          observedAt: observedAt.toISOString(), unitPrice: null, monthlyRent: null, netMonthlyIncome: null,
        });
      }
    }
  }
  return [...results.values()].slice(0, 20);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function publicText(value: unknown, max = 400): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim();
  if (!text || /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(text) || /https?:\/\//i.test(text)) return null;
  return text.slice(0, max);
}
function dateText(value: unknown): string | null {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
}
