import type { Asset } from "./assets";
import { DISCOVERY_COUNTRIES } from "./discovery-countries.ts";
import { searchPriceUsd, type ExchangeRateSnapshot } from "./currency.ts";

export type SearchCriteria = {
  country: SearchCountry;
  countries?: SearchCountry[];
  city: string | null;
  district: string | null;
  transaction: "sale" | "rent" | null;
  propertyType: Asset["propertyType"] | "land" | "commercial" | null;
  maxPriceUsd: number | null;
  budgetKrw: number | null;
  bedrooms: number | null;
  purpose: "income" | "seasonal" | "residence" | "general";
  wantsShortStay: boolean;
  wantsRiver: boolean;
  consultation?: ConsultationConditions;
};

export type ConsultationConditions = {
  budget: { amount: number; currency: "KRW" | "USD" | "PHP" | "VND"; scope: "purchase" | "monthlyRent" | "totalInvestment" } | null;
  targetMonthlyIncome: { amount: number; currency: "KRW" | "USD"; basis: "gross" | "net" | "unspecified" } | null;
  completedOnly: boolean;
  tenantedOnly: boolean;
  furnishedOnly: boolean;
  cashPurchase: boolean;
};

export type SearchCountry = "Cambodia" | "Vietnam" | "Philippines" | "Malaysia";

export type SearchResult = {
  coverage?: Array<{ country: SearchCountry; status: "collected" | "partial" | "unavailable"; collectedCount: number }>;
  criteria: SearchCriteria;
  answer: string;
  clarification: string | null;
  matches: Array<Asset & { matchReasons: string[] }>;
  rate: { krwPerUsd: number; asOf: string; rates?: ExchangeRateSnapshot["rates"] };
};

const SEARCH_RESULT_LIMIT = 18;

export const DEMO_KRW_PER_USD = 1380;
const PROPERTY_TYPES = new Set<SearchCriteria["propertyType"]>([
  "condo",
  "house",
  "villa",
  "land",
  "commercial",
]);
const PURPOSES = new Set<SearchCriteria["purpose"]>([
  "income",
  "seasonal",
  "residence",
  "general",
]);
const COUNTRIES = new Set<SearchCountry>([
  "Cambodia",
  "Vietnam",
  "Philippines",
  "Malaysia",
]);
export const CONNECTED_SEARCH_COUNTRIES = Object.keys(DISCOVERY_COUNTRIES) as SearchCountry[];
export function searchCountries(criteria: SearchCriteria): SearchCountry[] {
  return criteria.countries ?? [criteria.country];
}
const COUNTRY_PATTERNS: ReadonlyArray<{
  country: SearchCountry;
  pattern: RegExp;
}> = [
  { country: "Vietnam", pattern: /\b(?:vietnam|viet nam)\b|\uBCA0\uD2B8\uB0A8/i },
  { country: "Philippines", pattern: /\bphilippines?\b|\uD544\uB9AC\uD540/i },
  { country: "Malaysia", pattern: /\bmalaysia\b|\uB9D0\uB808\uC774\uC2DC\uC544/i },
  { country: "Cambodia", pattern: /\bcambodia\b|\uCE84\uBCF4\uB514\uC544|\uD504\uB188\uD39C/i },
];
const CITY_PATTERNS: ReadonlyArray<{
  country: SearchCountry;
  city: string;
  pattern: RegExp;
}> = [
  { country: "Cambodia", city: "Phnom Penh", pattern: /phnom penh|\uD504\uB188\uD39C/i },
  { country: "Cambodia", city: "Sihanoukville", pattern: /sihanoukville|preah sihanouk|\uC2DC\uD558\uB204\uD06C\uBE4C|\uC2DC\uC544\uB204\uD06C\uBE4C/i },
  { country: "Cambodia", city: "Siem Reap", pattern: /siem reap|\uC2DC\uC5E0\uB9BD|\uC528\uC5E0\uB9BD/i },
  { country: "Cambodia", city: "Kampot", pattern: /\bkampot\b|캠폿|캄폿/i },
  { country: "Cambodia", city: "Kep", pattern: /\bkep\b|\uCF00\uD504/i },
  { country: "Cambodia", city: "Battambang", pattern: /battambang|\uBC14\uD0D0\uBC29/i },
  { country: "Vietnam", city: "Ho Chi Minh City", pattern: /ho chi minh|hcmc|saigon|\uD638\uCE58\uBBFC|\uC0AC\uC774\uACF5/i },
  { country: "Vietnam", city: "Hanoi", pattern: /\bhanoi\b|\uD558\uB178\uC774/i },
  { country: "Vietnam", city: "Da Nang", pattern: /da nang|danang|\uB2E4\uB0AD/i },
  { country: "Vietnam", city: "Nha Trang", pattern: /nha trang|\uB098\uD2B8\uB791|\uB098\uC9F1/i },
  { country: "Vietnam", city: "Phu Quoc", pattern: /phu quoc|\uD478\uAFB8\uC625/i },
  { country: "Philippines", city: "Cebu", pattern: /\bcebu\b|\uC138\uBD80/i },
  { country: "Philippines", city: "Manila", pattern: /\bmanila\b|\uB9C8\uB2D0\uB77C/i },
  { country: "Philippines", city: "Makati", pattern: /\bmakati\b|\uB9C8\uCE74\uD2F0/i },
  { country: "Philippines", city: "Taguig", pattern: /\btaguig\b|\uD0C0\uAE30\uADF8/i },
  { country: "Philippines", city: "Davao", pattern: /\bdavao\b|\uB2E4\uBC14\uC624/i },
  { country: "Malaysia", city: "Kuala Lumpur", pattern: /kuala lumpur|\bklcc\b|\uCFE0\uC54C\uB77C\uB8F8\uD478\uB974/i },
  { country: "Malaysia", city: "Johor Bahru", pattern: /johor bahru|\bjb\b|\uC870\uD638\uBC14\uB8E8/i },
  { country: "Malaysia", city: "Penang", pattern: /\bpenang\b|\uD398\uB0AD/i },
];
const DISTRICT_ALIASES: ReadonlyArray<{
  district: string;
  patterns: readonly string[];
}> = [
  { district: "BKK1", patterns: ["bkk1", "벙깽꽁 1", "벙깽꽁1"] },
  { district: "BKK3", patterns: ["bkk3", "벙깽꽁 3", "벙깽꽁3"] },
  {
    district: "Tonle Bassac",
    patterns: ["tonle bassac", "톤레바삭", "톤레 바삭"],
  },
  {
    district: "Chrouy Changva",
    patterns: ["chrouy changva", "chroy changvar", "쯔루이창바", "크로이창바"],
  },
  {
    district: "Boeng Trabek",
    patterns: ["boeng trabek", "벙뜨라벡", "보응트라벡"],
  },
  { district: "Meanchey", patterns: ["meanchey", "민쩨이", "민체이"] },
];

export function parseSearchContext(value: unknown): SearchCriteria | null {
  if (!isRecord(value)) return null;
  if (typeof value.country !== "string" || !COUNTRIES.has(value.country as SearchCountry)) {
    return null;
  }
  if (value.countries !== undefined && (!Array.isArray(value.countries) || !value.countries.length ||
    value.countries.length > 4 || value.countries.some(country => !COUNTRIES.has(country)) ||
    new Set(value.countries).size !== value.countries.length || !value.countries.includes(value.country) ||
    (value.countries.length > 1 && (value.city !== null || value.district !== null)))) return null;
  if (
    value.city !== null &&
    (typeof value.city !== "string" || value.city.length === 0 || value.city.length > 80)
  ) {
    return null;
  }
  if (
    value.district !== null &&
    (typeof value.district !== "string" ||
      value.district.length === 0 ||
      value.district.length > 80)
  ) {
    return null;
  }
  if (
    value.transaction !== null &&
    value.transaction !== "sale" &&
    value.transaction !== "rent"
  ) {
    return null;
  }
  if (
    value.propertyType !== null &&
    (typeof value.propertyType !== "string" ||
      !PROPERTY_TYPES.has(value.propertyType as Asset["propertyType"]))
  ) {
    return null;
  }
  if (!isNullableNumber(value.maxPriceUsd, 1, 100_000_000)) return null;
  if (!isNullableNumber(value.budgetKrw, 1, 100_000_000_000)) return null;
  if (
    value.bedrooms !== null &&
    (typeof value.bedrooms !== "number" || !Number.isInteger(value.bedrooms) || value.bedrooms < 0 || value.bedrooms > 20)
  ) {
    return null;
  }
  if (
    typeof value.purpose !== "string" ||
    !PURPOSES.has(value.purpose as SearchCriteria["purpose"])
  ) {
    return null;
  }
  if (
    typeof value.wantsShortStay !== "boolean" ||
    typeof value.wantsRiver !== "boolean"
  ) {
    return null;
  }

  const consultation = value.consultation === undefined ? undefined : parseConsultationConditions(value.consultation);
  if (consultation === null) return null;

  return {
    country: value.country as SearchCountry,
    ...(value.countries ? { countries: value.countries as SearchCountry[] } : {}),
    city: value.city,
    district: value.district,
    transaction: value.transaction,
    propertyType: value.propertyType as Asset["propertyType"] | null,
    maxPriceUsd: value.maxPriceUsd,
    budgetKrw: value.budgetKrw,
    bedrooms: value.bedrooms,
    purpose: value.purpose as SearchCriteria["purpose"],
    wantsShortStay: value.wantsShortStay,
    wantsRiver: value.wantsRiver,
    ...(consultation ? { consultation } : {}),
  };
}

export function parseConsultationConditions(value: unknown): ConsultationConditions | null {
  if (!isRecord(value)) return null;
  for (const key of ["completedOnly", "tenantedOnly", "furnishedOnly", "cashPurchase"]) {
    if (typeof value[key] !== "boolean") return null;
  }
  for (const key of ["budget", "targetMonthlyIncome"]) {
    const money = value[key];
    if (money === null) continue;
    if (!isRecord(money) || typeof money.amount !== "number" ||
      !Number.isFinite(money.amount) || money.amount <= 0 || money.amount > 100_000_000_000 ||
      !(key === "budget" ? ["KRW", "USD", "PHP", "VND"] : ["KRW", "USD"]).includes(String(money.currency))) return null;
    if (key === "budget" && !["purchase", "monthlyRent", "totalInvestment"].includes(String(money.scope))) return null;
    if (key === "targetMonthlyIncome" && !["gross", "net", "unspecified"].includes(String(money.basis))) return null;
  }
  return {
    budget: value.budget === null ? null : {
      amount: (value.budget as NonNullable<ConsultationConditions["budget"]>).amount,
      currency: (value.budget as NonNullable<ConsultationConditions["budget"]>).currency,
      scope: (value.budget as NonNullable<ConsultationConditions["budget"]>).scope,
    },
    targetMonthlyIncome: value.targetMonthlyIncome === null ? null : {
      amount: (value.targetMonthlyIncome as NonNullable<ConsultationConditions["targetMonthlyIncome"]>).amount,
      currency: (value.targetMonthlyIncome as NonNullable<ConsultationConditions["targetMonthlyIncome"]>).currency,
      basis: (value.targetMonthlyIncome as NonNullable<ConsultationConditions["targetMonthlyIncome"]>).basis,
    },
    completedOnly: value.completedOnly as boolean,
    tenantedOnly: value.tenantedOnly as boolean,
    furnishedOnly: value.furnishedOnly as boolean,
    cashPurchase: value.cashPurchase as boolean,
  };
}

export function extractCriteria(
  query: string,
  context: SearchCriteria | null = null,
): SearchCriteria {
  const text = query.toLowerCase();
  if (/조건\s*초기화|처음부터|새\s*탐색/.test(text)) context = null;
  const explicitCity = CITY_PATTERNS.find(({ pattern }) => pattern.test(text));
  const explicitCountry =
    COUNTRY_PATTERNS.find(({ pattern }) => pattern.test(text))?.country ??
    explicitCity?.country;
  const namedCountries = COUNTRY_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(entry => entry.country);
  const district = DISTRICT_ALIASES.find(({ patterns }) => patterns.some(pattern => text.includes(pattern)))?.district ?? null;
  const broadScope = /국가.*(?:정하지|상관없|무관)|세\s*나라|전체\s*국가|모든\s*국가/.test(text);
  const countries = namedCountries.length ? namedCountries : explicitCity ? [explicitCity.country]
    : broadScope ? CONNECTED_SEARCH_COUNTRIES : district ? ["Cambodia" as const] : context ? searchCountries(context) : CONNECTED_SEARCH_COUNTRIES;
  const country = countries[0] ?? explicitCountry ?? "Cambodia";
  const city = countries.length > 1 ? null : explicitCity?.country === country ? explicitCity.city : extractCity(text, country) ??
    (explicitCountry && explicitCountry !== context?.country ? defaultCity(country) : context?.city) ??
    defaultCity(country);
  const income =
    /투자|수익|월세(?:가|를|로)?\s*(?:잘|수익|받)|임대\s*(?:수익|료)|\b(?:invest(?:ment|ing)?|yield|income)\b/i.test(text) ||
    (context?.purpose === "income" && !/내가\s*(?:살|거주)|직접\s*거주|임차|빌려|세입자|투자.*(?:아니|말고)/.test(text));
  const seasonal =
    /별장|세컨드\s*하우스|겨울마다|개월.*(?:쉬|놀|체류)|내가 없을 때|\b(?:vacation|holiday|second)\s+home\b|\bseasonal\b/.test(text);
  const explicitRent = /임대|월세|렌트|\brent(?:al|ing)?\b/.test(text);
  const explicitSale = /매매|구매|매입|\b(?:sale|buy|buying|purchase|purchasing)\b/.test(text);
  const type = /빌라|villa/.test(text)
    ? "villa"
    : /주택|하우스|house/.test(text)
      ? "house"
      : /콘도|아파트|condo|apartment/.test(text)
        ? "condo"
        : null;
  const bedroomMatch = text.match(/(\d+)\s*[- ]?\s*(?:베드|침실|br\b|bed(?:room)?s?\b)/);
  const usdMatch = text.match(/(?:us\$|\$|\busd\s*)\s*([\d,]+(?:\.\d+)?)\s*(million\b|thousand\b|[km]\b)?|([\d,]+(?:\.\d+)?)\s*(million\b|thousand\b|[km]\b)?\s*(?:달러|불|usd\b|dollars?\b|\$)/);
  // Conversational budgets commonly omit "원" (for example, "1억 정도").
  const krwMatch = text.match(/([\d,.]+)\s*(억|천만|만)(?:\s*원)?/);
  let budgetKrw: number | null = null;
  let maxPriceUsd: number | null = null;

  if (usdMatch) {
    const amount = Number((usdMatch[1] ?? usdMatch[3]).replace(/,/g, ""));
    const unit = usdMatch[2] ?? usdMatch[4];
    const value = amount * (unit === "m" || unit === "million" ? 1_000_000 : unit === "k" || unit === "thousand" ? 1_000 : 1);
    if (Number.isFinite(value) && value > 0) maxPriceUsd = value;
  }
  if (krwMatch) {
    const unit =
      krwMatch[2] === "억" ? 100_000_000 : krwMatch[2] === "천만" ? 10_000_000 : 10_000;
    budgetKrw = Number(krwMatch[1].replace(/,/g, "")) * unit;
    maxPriceUsd = Math.round(budgetKrw / DEMO_KRW_PER_USD);
  }
  const englishKrw = text.match(/\bkrw\s*([\d,]+(?:\.\d+)?)\s*(million\b|billion\b|thousand\b|[kmb]\b)?|([\d,]+(?:\.\d+)?)\s*(million\b|billion\b|thousand\b|[kmb]\b)?\s*krw\b/);
  if (englishKrw) {
    const unit = englishKrw[2] ?? englishKrw[4];
    const value = Number((englishKrw[1] ?? englishKrw[3]).replace(/,/g, "")) *
      (unit === "b" || unit === "billion" ? 1_000_000_000 : unit === "m" || unit === "million" ? 1_000_000 : unit === "k" || unit === "thousand" ? 1_000 : 1);
    if (Number.isFinite(value) && value > 0) {
      budgetKrw = value;
      // Same legacy search filter as Korean budgets; not observed FX evidence.
      maxPriceUsd = Math.round(budgetKrw / DEMO_KRW_PER_USD);
    }
  }
  const nativeMoney = text.match(/([\d,.]+)\s*(만|천)?\s*(페소|php|동|vnd)(?:\b|\s|이하|까지|으로|의|$)/i);
  const nativeBudget = nativeMoney ? {
    amount: Number(nativeMoney[1].replace(/,/g, "")) * (nativeMoney[2] === "만" ? 10_000 : nativeMoney[2] === "천" ? 1_000 : 1),
    currency: /페소|php/i.test(nativeMoney[3]) ? "PHP" as const : "VND" as const,
    scope: explicitRent && !income ? "monthlyRent" as const : "purchase" as const,
  } : null;

  const current: SearchCriteria = {
    country,
    ...(countries.length > 1 ? { countries: [...countries] } : {}),
    city,
    district: countries.length > 1 ? null : district,
    transaction: explicitRent && !income && !explicitSale ? "rent" : explicitSale || income || seasonal ? "sale" : null,
    propertyType: type,
    maxPriceUsd,
    budgetKrw,
    bedrooms: bedroomMatch ? Number(bedroomMatch[1]) : null,
    purpose: seasonal ? "seasonal" : income ? "income" : explicitRent ? "residence" : "general",
    wantsShortStay: /에어비앤비|airbnb|단기\s*임대|short[- ]term\s+rent(?:al)?|short\s+stay/.test(text),
    wantsRiver: /강|메콩|리버|river|전망/.test(text),
    ...(nativeBudget ? { consultation: { budget: nativeBudget, targetMonthlyIncome: null,
      completedOnly: false, tenantedOnly: false, furnishedOnly: false, cashPurchase: false } } : {}),
  };

  if (!context || /조건\s*초기화|처음부터|새\s*탐색/.test(text)) {
    return current;
  }

  const removesRiver =
    /(?:강|메콩|리버|river|전망).*(?:필요\s*없|상관\s*없|제외)/.test(text);
  const removesShortStay =
    /(?:에어비앤비|airbnb|단기\s*임대).*(?:필요\s*없|상관\s*없|제외)/.test(text);

  return {
    ...(current.consultation ?? context.consultation ? { consultation: current.consultation ?? context.consultation } : {}),
    country,
    ...(countries.length > 1 ? { countries: [...countries] } : {}),
    city,
    district: countries.length > 1 ? null : current.district ?? (country === context.country && city === context.city ? context.district : null),
    transaction: current.transaction ?? context.transaction,
    propertyType: current.propertyType ?? context.propertyType,
    maxPriceUsd: current.maxPriceUsd ?? context.maxPriceUsd,
    budgetKrw: current.budgetKrw ?? context.budgetKrw,
    bedrooms: /(?:침실|베드).*(?:상관\s*없|무관|제한\s*없|필요\s*없)/.test(text) ? null : current.bedrooms ?? context.bedrooms,
    purpose: current.purpose === "general" ? context.purpose : current.purpose,
    wantsShortStay: removesShortStay
      ? false
      : current.wantsShortStay || context.wantsShortStay,
    wantsRiver: removesRiver ? false : current.wantsRiver || context.wantsRiver,
  };
}

export function searchAssets(
  query: string,
  allAssets: Asset[],
  context: SearchCriteria | null = null,
): SearchResult {
  const criteria = extractCriteria(query, context);
  return searchAssetsByCriteria(criteria, allAssets);
}

// GLI-052: the consultation pipeline must not re-parse the query after planning.
export function searchAssetsByCriteria(
  criteria: SearchCriteria,
  allAssets: Asset[],
  options: { strict?: boolean } = {},
): SearchResult {
  // Country and city are hard recommendation boundaries. Other conditions may
  // be relaxed only inside the requested location and only as a visible fallback.
  const countryAssets = allAssets.filter((asset) => searchCountries(criteria).includes(asset.country as SearchCountry));
  const city = criteria.city;
  const locationAssets = city
    ? countryAssets.filter((asset) => sameLocation(asset.city, city))
    : countryAssets;
  const exact = locationAssets.filter((asset) => {
    if (criteria.transaction && asset.transaction !== criteria.transaction) return false;
    if (criteria.district && asset.district !== criteria.district) return false;
    if (criteria.propertyType && asset.propertyType !== criteria.propertyType) return false;
    if (criteria.bedrooms !== null && asset.bedrooms !== criteria.bedrooms) return false;
    const priceUsd = searchPriceUsd(asset);
    if (criteria.maxPriceUsd !== null && (priceUsd === null || priceUsd > criteria.maxPriceUsd)) return false;
    if (
      criteria.wantsRiver &&
      !/river|mekong|riverside|강|메콩/i.test(`${asset.title} ${asset.summary}`)
    ) {
      return false;
    }
    return true;
  });

  const pool = exact.length || options.strict
    ? exact
    : locationAssets.filter(
        (asset) =>
          (!criteria.transaction || asset.transaction === criteria.transaction) &&
          (!criteria.district || asset.district === criteria.district) &&
          (!criteria.propertyType || asset.propertyType === criteria.propertyType),
      );

  const matches = pool
    .map((asset) => ({
      ...asset,
      matchReasons: buildReasons(asset, criteria, exact.length === 0),
      rank: rankAsset(asset, criteria),
    }))
    .sort((a, b) => b.rank - a.rank)
    .slice(0, criteria.countries?.length ? 5 : SEARCH_RESULT_LIMIT)
    .map(({ rank, ...asset }) => {
      void rank;
      return asset;
    });

  return {
    criteria,
    answer: buildAnswer(criteria, exact.length, matches.length, locationAssets.length),
    clarification:
      matches.length === 0
        ? `${locationLabel(criteria)}에서 현재 조건에 맞는 자산을 찾지 못했습니다. 다른 도시나 국가까지 범위를 넓혀 검토할까요?`
        : buildClarification(criteria),
    matches,
    rate: { krwPerUsd: DEMO_KRW_PER_USD, asOf: "demo-reference" },
  };
}

function sameLocation(left: string, right: string): boolean {
  return left.trim().toLocaleLowerCase("en-US") === right.trim().toLocaleLowerCase("en-US");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableNumber(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number | null {
  return (
    value === null ||
    (typeof value === "number" &&
      Number.isFinite(value) &&
      value >= minimum &&
      value <= maximum)
  );
}

function rankAsset(asset: Asset, criteria: SearchCriteria): number {
  let rank = asset.trustScore;
  if (asset.isGliDirect) rank += 4;
  if (criteria.district && asset.district === criteria.district) rank += 18;
  const priceUsd = searchPriceUsd(asset);
  if (criteria.maxPriceUsd && priceUsd !== null && priceUsd <= criteria.maxPriceUsd) rank += 8;
  if (criteria.purpose === "seasonal" && /BKK1|river|Mekong|Riverside/i.test(asset.title)) rank += 10;
  if (criteria.purpose === "income" && asset.areaSqm <= 50) rank += 6;
  if (criteria.wantsRiver && /river|mekong|riverside/i.test(asset.title)) rank += 12;
  return rank;
}

function buildReasons(asset: Asset, criteria: SearchCriteria, nearest: boolean): string[] {
  const reasons: string[] = [];
  if (nearest) reasons.push("정확 일치가 없어 가까운 대안");
  if (criteria.district && asset.district === criteria.district) {
    reasons.push(`${criteria.district} 지역`);
  }
  const priceUsd = searchPriceUsd(asset);
  if (criteria.maxPriceUsd && priceUsd !== null && priceUsd <= criteria.maxPriceUsd) reasons.push("예산 범위");
  if (criteria.bedrooms !== null && asset.bedrooms === criteria.bedrooms) {
    reasons.push(`${asset.bedrooms}베드 조건`);
  }
  if (criteria.purpose === "income") reasons.push("임대 수요 검토 후보");
  if (criteria.purpose === "seasonal") reasons.push("계절 체류 후보");
  if (criteria.wantsRiver && /river|mekong|riverside/i.test(asset.title)) reasons.push("강변 조건");
  if (asset.isGliDirect) reasons.push(asset.originLabel ?? "GLI Direct");
  return reasons.slice(0, 3);
}

function buildClarification(criteria: SearchCriteria): string | null {
  if (criteria.purpose === "seasonal" && criteria.maxPriceUsd === null) {
    return "매입 예산 상한과 머무를 인원을 알려주시면 후보를 더 정확히 좁힐 수 있습니다.";
  }
  if (criteria.purpose === "income" && criteria.maxPriceUsd === null) {
    return "총 매입 예산과 목표 월 임대료가 있나요?";
  }
  if (criteria.transaction === null) {
    return "매매와 임대 중 어느 쪽을 우선으로 볼까요?";
  }
  return null;
}

function buildAnswer(
  criteria: SearchCriteria,
  exactCount: number,
  shownCount: number,
  locationAssetCount: number,
): string {
  if (shownCount === 0) {
    const reason = locationAssetCount === 0
      ? "현재 공개된 자산이 없습니다."
      : "현재 요청 조건에 맞는 자산이 없습니다.";
    return `${locationLabel(criteria)}에는 ${reason} 국가 조건을 임의로 변경하지 않았고, 도시 조건도 유지해 다른 지역의 자산을 추천하지 않았습니다.`;
  }
  const budget = criteria.budgetKrw
    ? `약 ${(criteria.budgetKrw / 10_000).toLocaleString("ko-KR")}만원은 데모 기준 약 $${criteria.maxPriceUsd?.toLocaleString("en-US")}입니다. `
    : "";
  const location = locationLabel(criteria);

  if (criteria.purpose === "income") {
    return exactCount
      ? `${budget}예산 안에서 ${exactCount}개 후보를 찾았습니다. 광고가만으로 수익을 판단하지 않고 실제 임대료, 공실률, 관리비와 소유권 자료를 확인해야 합니다.`
      : `${budget}현재 예산에 정확히 맞는 매매 후보가 없어 가까운 대안 ${shownCount}개를 보여드립니다. 예산을 넓히기 전에 실제 임대료와 총비용 자료부터 확보하는 편이 좋습니다.`;
  }
  if (criteria.purpose === "seasonal") {
    return exactCount
      ? `${budget}3개월 체류와 부재 중 운영을 함께 고려한 후보 ${shownCount}개를 정리했습니다. 단기 임대 가능 여부는 건물 규정, 현지 규제와 운영대행 수수료를 별도로 확인해야 합니다.`
      : `${budget}요청 조건과 정확히 일치하는 매매 후보가 없어 가까운 대안 ${shownCount}개를 보여드립니다. 침실 수와 가격 차이를 확인한 뒤, 단기 임대 가능 여부와 운영대행 수수료를 별도로 검토해야 합니다.`;
  }
  return `${budget}${location} 조건에서 ${shownCount}개 후보를 찾았습니다. Trust 등급은 자료 신뢰도를 뜻하며 투자 수익을 보장하지 않습니다.`;
}

function extractCity(text: string, country: SearchCountry): string | null {
  return CITY_PATTERNS.find(
    (entry) => entry.country === country && entry.pattern.test(text),
  )?.city ?? null;
}

function locationLabel(criteria: SearchCriteria): string {
  return criteria.city
    ? `${countryLabel(criteria.country)} ${criteria.city}`
    : searchCountries(criteria).map(countryLabel).join(" · ");
}

function defaultCity(country: SearchCountry): string | null {
  return country === "Cambodia" ? "Phnom Penh" : null;
}

function countryLabel(country: SearchCountry): string {
  return {
    Cambodia: "캄보디아",
    Vietnam: "베트남",
    Philippines: "필리핀",
    Malaysia: "말레이시아",
  }[country];
}
