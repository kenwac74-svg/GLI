import type { Asset } from "./assets";

export type SearchCriteria = {
  country: SearchCountry;
  city: string | null;
  district: string | null;
  transaction: "sale" | "rent" | null;
  propertyType: Asset["propertyType"] | null;
  maxPriceUsd: number | null;
  budgetKrw: number | null;
  bedrooms: number | null;
  purpose: "income" | "seasonal" | "residence" | "general";
  wantsShortStay: boolean;
  wantsRiver: boolean;
};

export type SearchCountry = "Cambodia" | "Vietnam" | "Philippines" | "Malaysia";

export type SearchResult = {
  criteria: SearchCriteria;
  answer: string;
  clarification: string | null;
  matches: Array<Asset & { matchReasons: string[] }>;
  rate: { krwPerUsd: number; asOf: string };
};

const SEARCH_RESULT_LIMIT = 18;

const DEMO_KRW_PER_USD = 1380;
const PROPERTY_TYPES = new Set<Asset["propertyType"]>([
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
  { country: "Cambodia", city: "Kampot", pattern: /\bkampot\b|\uCEA0\uD3FF/i },
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
    (!Number.isInteger(value.bedrooms) || value.bedrooms < 0 || value.bedrooms > 20)
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

  return {
    country: value.country as SearchCountry,
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
  };
}

export function extractCriteria(
  query: string,
  context: SearchCriteria | null = null,
): SearchCriteria {
  const text = query.toLowerCase();
  const explicitCity = CITY_PATTERNS.find(({ pattern }) => pattern.test(text));
  const explicitCountry =
    COUNTRY_PATTERNS.find(({ pattern }) => pattern.test(text))?.country ??
    explicitCity?.country;
  const country = explicitCountry ?? context?.country ?? "Cambodia";
  const city = explicitCity?.country === country ? explicitCity.city : extractCity(text, country) ??
    (explicitCountry && explicitCountry !== context?.country ? defaultCity(country) : context?.city) ??
    defaultCity(country);
  const district =
    DISTRICT_ALIASES.find(({ patterns }) =>
      patterns.some((pattern) => text.includes(pattern)),
    )?.district ?? null;
  const income = /투자|수익|월세 잘|임대수익|yield/.test(text);
  const seasonal =
    /별장|세컨드\s*하우스|겨울마다|개월.*(?:쉬|놀|체류)|내가 없을 때/.test(text);
  const explicitRent = /임대|월세|렌트|rent/.test(text);
  const explicitSale = /매매|구매|매입|sale/.test(text);
  const type = /빌라|villa/.test(text)
    ? "villa"
    : /주택|하우스|house/.test(text)
      ? "house"
      : /콘도|아파트|condo|apartment/.test(text)
        ? "condo"
        : null;
  const bedroomMatch = text.match(/(\d+)\s*(?:베드|침실|br)/);
  const usdMatch = text.match(/\$?\s*([\d,.]+)\s*(?:달러|불|usd|\$)/);
  const krwMatch = text.match(/([\d,.]+)\s*(억|천만|만)\s*원/);
  let budgetKrw: number | null = null;
  let maxPriceUsd: number | null = null;

  if (usdMatch) maxPriceUsd = Number(usdMatch[1].replace(/,/g, ""));
  if (krwMatch) {
    const unit =
      krwMatch[2] === "억" ? 100_000_000 : krwMatch[2] === "천만" ? 10_000_000 : 10_000;
    budgetKrw = Number(krwMatch[1].replace(/,/g, "")) * unit;
    maxPriceUsd = Math.round(budgetKrw / DEMO_KRW_PER_USD);
  }

  const current: SearchCriteria = {
    country,
    city,
    district,
    transaction: explicitRent && !income ? "rent" : explicitSale || income || seasonal ? "sale" : null,
    propertyType: type,
    maxPriceUsd,
    budgetKrw,
    bedrooms: bedroomMatch ? Number(bedroomMatch[1]) : null,
    purpose: seasonal ? "seasonal" : income ? "income" : explicitRent ? "residence" : "general",
    wantsShortStay: /에어비앤비|airbnb|단기\s*임대/.test(text),
    wantsRiver: /강|메콩|리버|river|전망/.test(text),
  };

  if (!context || /조건\s*초기화|처음부터|새\s*탐색/.test(text)) {
    return current;
  }

  const removesRiver =
    /(?:강|메콩|리버|river|전망).*(?:필요\s*없|상관\s*없|제외)/.test(text);
  const removesShortStay =
    /(?:에어비앤비|airbnb|단기\s*임대).*(?:필요\s*없|상관\s*없|제외)/.test(text);

  return {
    country,
    city,
    district: current.district ?? context.district,
    transaction: current.transaction ?? context.transaction,
    propertyType: current.propertyType ?? context.propertyType,
    maxPriceUsd: current.maxPriceUsd ?? context.maxPriceUsd,
    budgetKrw: current.budgetKrw ?? context.budgetKrw,
    bedrooms: current.bedrooms ?? context.bedrooms,
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
  // Country and city are hard recommendation boundaries. Other conditions may
  // be relaxed only inside the requested location and only as a visible fallback.
  const countryAssets = allAssets.filter((asset) => asset.country === criteria.country);
  const locationAssets = criteria.city
    ? countryAssets.filter((asset) => sameLocation(asset.city, criteria.city))
    : countryAssets;
  const exact = locationAssets.filter((asset) => {
    if (criteria.transaction && asset.transaction !== criteria.transaction) return false;
    if (criteria.district && asset.district !== criteria.district) return false;
    if (criteria.propertyType && asset.propertyType !== criteria.propertyType) return false;
    if (criteria.bedrooms !== null && asset.bedrooms !== criteria.bedrooms) return false;
    if (criteria.maxPriceUsd !== null && asset.price > criteria.maxPriceUsd) return false;
    if (
      criteria.wantsRiver &&
      !/river|mekong|riverside|강|메콩/i.test(`${asset.title} ${asset.summary}`)
    ) {
      return false;
    }
    return true;
  });

  const pool = exact.length
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
    .slice(0, SEARCH_RESULT_LIMIT)
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
  if (criteria.maxPriceUsd && asset.price <= criteria.maxPriceUsd) rank += 8;
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
  if (criteria.maxPriceUsd && asset.price <= criteria.maxPriceUsd) reasons.push("예산 범위");
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
  const location = criteria.city
    ? `${countryLabel(criteria.country)} ${criteria.city}`
    : countryLabel(criteria.country);

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
  return `${budget}${location} 조건에서 ${shownCount}개 후보를 찾았습니다. Trust Score는 자료 신뢰도를 뜻하며 투자 수익을 보장하지 않습니다.`;
}

function extractCity(text: string, country: SearchCountry): string | null {
  return CITY_PATTERNS.find(
    (entry) => entry.country === country && entry.pattern.test(text),
  )?.city ?? null;
}

function locationLabel(criteria: SearchCriteria): string {
  return criteria.city
    ? `${countryLabel(criteria.country)} ${criteria.city}`
    : countryLabel(criteria.country);
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
