import type { SearchCriteria } from "./search.ts";
import { englishDemoAsset, localizeDemoAsset } from "./demo-asset-localization.ts";
import { convertCurrency, isPriceCurrency, type ExchangeRateSnapshot } from "./currency.ts";
import { geographyLabel, localizeSeparatedGeography } from "./location-display.ts";

// GLI-SPEC: GS-001 GS-010. Display projection only; never rank/filter in the UI.
export type Candidate = {
  id: string; title: string; country: string; city: string; district: string;
  transaction: "sale" | "rent"; price: number; maxPrice?: number; currency: string;
  areaSqm: number; bedrooms: number | null; bathrooms: number | null; image: string; trustScore: number;
  originLabel?: string; sourceName?: string; sourceUrl?: string; priceLabel?: string;
  matchReasons?: string[];
  sourcePublishedAt?: string;
  propertyType?: string;
  favoriteRefId?: string;
  detailOrigin?: "fixture" | "search";
  retainedStatus?: string;
};
export type Citation = { assetId: string; label: string; sourceName?: string; url?: string };
export type SearchPayload = {
  answer: string; clarification: string | null; criteria?: SearchCriteria;
  matches: Candidate[]; citations?: Citation[];
  resultSet?: { assetIds: string[]; returnedCount: number };
  consultation?: { mode: "search" | "review" | "clarify"; referencedAssetIds: string[]; missingAssetIds: string[] };
  advisor?: { groundedAssetIds: string[] };
  rate?: { krwPerUsd: number; asOf: string; rates?: ExchangeRateSnapshot["rates"] };
};
export type RuntimeTurn = {
  id: string; role: "나" | "GLI AI"; text: string; resultUpdate?: string;
  result?: SearchPayload; onAsset?: string;
};

export function trustGrade(score: number) {
  return score >= 90 ? "S" : score >= 85 ? "A+" : score >= 80 ? "A" : score >= 75 ? "B+"
    : score >= 70 ? "B" : score >= 65 ? "C+" : score >= 60 ? "C" : "D";
}

export function candidatePrice(asset: Candidate) {
  if (!(asset.price > 0)) return "자료상 가격 미기재";
  const format = (value: number) => new Intl.NumberFormat("en-US", {
    style: "currency", currency: asset.currency, maximumFractionDigits: 0,
    ...(value >= 1_000_000 ? { notation: "compact" as const, maximumFractionDigits: 2 } : {}),
  }).format(value);
  return `${format(asset.price)}${asset.maxPrice && asset.maxPrice > asset.price ? `~${format(asset.maxPrice)}` : ""}`;
}

export function displayResult(next: SearchPayload, previous: SearchPayload | null): SearchPayload {
  if (!previous || !next.consultation || next.consultation.mode === "search") return next;
  // Preserve membership/order, but accept refreshed fields for the same asset.
  // Keeping previous objects here discarded server translations during reviews.
  const refreshed = new Map(next.matches.map(asset => [asset.id, asset]));
  return { ...next, matches: previous.matches.map(asset => refreshed.get(asset.id) ?? asset), resultSet: previous.resultSet,
    criteria: next.criteria ?? previous.criteria };
}

export function localizeDemoResult(result: SearchPayload, locale: "ko" | "en" = "ko"): SearchPayload {
  if (locale === "en") {
    const matches = result.matches.map(englishDemoAsset);
    return matches.some((asset, i) => asset !== result.matches[i]) ? { ...result, matches } : result;
  }
  const replacements = result.matches.flatMap(asset => {
    const localized = { ...localizeDemoAsset(asset), title: localizeSeparatedGeography(localizeDemoAsset(asset).title) };
    return localized.title !== asset.title ? [[asset.title, localized.title] as const] : [];
  });
  if (!replacements.length) return result;
  const text = (value: string) => replacements.reduce((copy, [from, to]) => copy.replaceAll(from, to), value);
  // Only known fixture names in saved AI output are migrated, never user messages.
  return { ...result, answer: text(result.answer), clarification: result.clarification ? text(result.clarification) : null,
    matches: result.matches.map(asset => ({ ...localizeDemoAsset(asset), title: localizeSeparatedGeography(localizeDemoAsset(asset).title), matchReasons: asset.matchReasons?.map(text) })),
    citations: result.citations?.map(cite => ({ ...cite, label: text(cite.label) })) };
}

export function localizeDemoTurn(turn: RuntimeTurn, locale: "ko" | "en" = "ko"): RuntimeTurn {
  if (turn.role !== "GLI AI" || !turn.result) return turn;
  const result = localizeDemoResult(turn.result, locale);
  return result === turn.result ? turn : { ...turn, result, text: [result.answer, result.clarification].filter(Boolean).join("\n") };
}

export function candidateConverted(asset: Candidate, rate?: SearchPayload["rate"], locale: "ko" | "en" = "ko") {
  if (locale === "en") {
    if (asset.currency === "USD" || !(asset.price > 0)) return "";
    const rates = rate?.rates ?? (rate ? { USD: 1, KRW: rate.krwPerUsd } : {});
    const value = isPriceCurrency(asset.currency) ? convertCurrency(asset.price, asset.currency, "USD", rates) : null;
    const maximum = asset.maxPrice && isPriceCurrency(asset.currency) ? convertCurrency(asset.maxPrice, asset.currency, "USD", rates) : null;
    if (value === null) return "Currency conversion unavailable";
    const format = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
    return `Approx. ${format(value)}${maximum !== null && maximum > value ? `–${format(maximum)}` : ""}${asset.transaction === "rent" ? "/month" : ""}`;
  }
  if (asset.currency === "KRW" || !(asset.price > 0)) return "";
  if (!isPriceCurrency(asset.currency) || !rate) return "원화 환산 미확인";
  const rates = rate.rates ?? { USD: 1, KRW: rate.krwPerUsd };
  const minimum = convertCurrency(asset.price, asset.currency, "KRW", rates);
  const maximum = asset.maxPrice && asset.maxPrice > asset.price ? convertCurrency(asset.maxPrice, asset.currency, "KRW", rates) : null;
  if (minimum === null || !Number.isFinite(minimum) || minimum <= 0) return "원화 환산 미확인";
  const format = (amount: number) => Math.round(amount).toLocaleString("ko-KR");
  return `약 ${format(minimum)}${maximum !== null ? `~${format(maximum)}` : ""}원${asset.transaction === "rent" ? "/월" : ""}`;
}

export function summaryOf(result: SearchPayload) {
  const mode = result.consultation?.mode ?? "search";
  const ids = result.matches.map(asset => asset.id);
  const missing = new Set(result.consultation?.missingAssetIds ?? []);
  const refs = mode === "search" ? ids : result.consultation?.referencedAssetIds ?? [];
  const leads = result.matches.map((asset, index) => ({ asset, rank: index + 1 }))
    .filter(({ asset }) => refs.includes(asset.id) && !missing.has(asset.id)).slice(0, 3);
  const known = new Set(refs.filter(id => ids.includes(id) && !missing.has(id)));
  const seen = new Set<string>();
  const citations = (result.citations ?? []).filter(cite => {
    const key = JSON.stringify([cite.assetId, cite.url ?? "", cite.label]);
    if (!known.has(cite.assetId) || seen.has(key)) return false;
    seen.add(key); return true;
  }).map(cite => ({ ...cite, url: safeSourceUrl(cite.url), rank: ids.indexOf(cite.assetId) + 1 }));
  const pending = leads.filter(({ asset }) => !citations.some(cite => cite.assetId === asset.id)).length;
  return { leads, citations, pending, mode, count: ids.length, missing: missing.size };
}

export function safeSourceUrl(url?: string) {
  if (!url) return undefined;
  try { const parsed = new URL(url); return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : undefined; }
  catch { return undefined; }
}

export function conditionChips(criteria?: SearchCriteria, locale: "ko" | "en" = "ko") {
  if (!criteria) return [];
  if (locale === "en") {
    const chips = [[(criteria.countries ?? [criteria.country]).join(" · "), criteria.city ?? ""].filter(Boolean).join(" ")];
    const conditions = criteria.consultation;
    const money = (amount: number, currency: string) => `${currency} ${amount.toLocaleString("en-US")}`;
    if (criteria.transaction) chips.push(criteria.transaction === "rent" ? "For rent" : "For sale");
    if (conditions?.budget) {
      const b = conditions.budget;
      const label = b.scope === "monthlyRent" ? "Monthly budget" : b.scope === "totalInvestment" ? "Total budget" : "Purchase budget";
      chips.push(`${label} ${money(b.amount, b.currency)}`);
    } else if (criteria.budgetKrw) chips.push(`Budget ${money(criteria.budgetKrw, "KRW")}`);
    if (conditions?.targetMonthlyIncome) chips.push(`Target monthly income ${money(conditions.targetMonthlyIncome.amount, conditions.targetMonthlyIncome.currency)}`);
    if (criteria.bedrooms != null) chips.push(criteria.bedrooms === 0 ? "Studio" : `${criteria.bedrooms} bedrooms`);
    return chips;
  }
  const chips = [[(criteria.countries ?? [criteria.country]).map(geographyLabel).join(" · "), criteria.city ? geographyLabel(criteria.city) : ""].filter(Boolean).join(" ")];
  const conditions = criteria.consultation;
  const money = (amount: number, currency: string) => currency === "KRW"
    ? amount >= 100000000 && amount % 100000000 === 0 ? `${amount / 100000000}억원`
      : amount >= 10000 && amount % 10000 === 0 ? `${(amount / 10000).toLocaleString("ko-KR")}만원` : `${amount.toLocaleString("ko-KR")}원`
    : `${amount.toLocaleString("ko-KR")} ${currency}`;
  if (criteria.transaction) chips.push(criteria.transaction === "rent" ? "임대" : "매매");
  if (conditions?.budget) {
    const b = conditions.budget;
    const label = b.scope === "monthlyRent" ? "월 예산" : b.scope === "totalInvestment" ? "총예산" : "매입 예산";
    chips.push(`${label} ${money(b.amount, b.currency)}`);
  } else if (criteria.budgetKrw) chips.push(`예산 ${money(criteria.budgetKrw, "KRW")}`);
  if (conditions?.targetMonthlyIncome) {
    const income = conditions.targetMonthlyIncome;
    chips.push(`목표 월수입 ${money(income.amount, income.currency)}`);
  }
  if (criteria.bedrooms != null) chips.push(criteria.bedrooms === 0 ? "스튜디오" : `${criteria.bedrooms}베드`);
  return chips;
}

// Keep every character, including text after the last punctuation mark.
export function answerParagraphs(text: string) {
  return text.split(/\n\s*\n|\n/).filter(part => part.trim().length);
}
