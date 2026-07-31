import type { Asset } from "./assets";

export type SearchCriteria = {
  country: "Cambodia";
  city: "Phnom Penh";
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

export type SearchResult = {
  criteria: SearchCriteria;
  answer: string;
  clarification: string | null;
  matches: Array<Asset & { matchReasons: string[] }>;
  rate: { krwPerUsd: number; asOf: string };
};

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
  if (value.country !== "Cambodia" || value.city !== "Phnom Penh") return null;
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
    country: "Cambodia",
    city: "Phnom Penh",
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
    country: "Cambodia",
    city: "Phnom Penh",
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
    country: "Cambodia",
    city: "Phnom Penh",
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
  const exact = allAssets.filter((asset) => {
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
    : allAssets.filter(
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
    .slice(0, 6)
    .map(({ rank, ...asset }) => {
      void rank;
      return asset;
    });

  return {
    criteria,
    answer: buildAnswer(criteria, exact.length, matches.length),
    clarification: buildClarification(criteria),
    matches,
    rate: { krwPerUsd: DEMO_KRW_PER_USD, asOf: "demo-reference" },
  };
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
  if (asset.isGliDirect) reasons.push("GLI Direct");
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

function buildAnswer(criteria: SearchCriteria, exactCount: number, shownCount: number): string {
  const budget = criteria.budgetKrw
    ? `약 ${(criteria.budgetKrw / 10_000).toLocaleString("ko-KR")}만원은 데모 기준 약 $${criteria.maxPriceUsd?.toLocaleString("en-US")}입니다. `
    : "";

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
  return `${budget}프놈펜 조건에서 ${shownCount}개 후보를 찾았습니다. Trust Score는 자료 신뢰도를 뜻하며 투자 수익을 보장하지 않습니다.`;
}
