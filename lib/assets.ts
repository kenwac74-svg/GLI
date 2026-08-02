import type { PriceCurrency } from "./currency.ts";

export type TrustStatus =
  | "PRELIMINARY"
  | "REVIEWING"
  | "VERIFIED"
  | "NEEDS_ATTENTION";

export type AssetCategory =
  | "residential"
  | "commercial"
  | "leisure"
  | "project";

export type AssetFact = {
  label: string;
  value: string;
};

export type AssetPublicResource = {
  label: string;
  url: string;
  type: "website" | "video" | "article";
};

export type Asset = {
  id: string;
  country: string;
  countryCode: string;
  city: string;
  district: string;
  transaction: "sale" | "rent";
  propertyType: "condo" | "house" | "villa";
  assetCategory?: AssetCategory;
  categoryLabel?: string;
  offerLabel?: string;
  priceLabel?: string;
  cardMeta?: string;
  detailFacts?: AssetFact[];
  bedrooms: number;
  bathrooms: number;
  title: string;
  price: number;
  maxPrice?: number;
  currency: PriceCurrency;
  areaSqm: number;
  image: string;
  images?: string[];
  publicResources?: AssetPublicResource[];
  summary: string;
  trustScore: number;
  trustStatus: TrustStatus;
  isGliDirect: boolean;
  originLabel?: string;
  documentDateLabel?: string;
  publicationBasis?: string;
  sourceName?: string;
  sourceUrl?: string;
  updatedAt: string;
  strengths: string[];
  checks: string[];
};

export const assets: Asset[] = [
  {
    id: "GLI-KH-101",
    country: "Cambodia",
    countryCode: "KH",
    city: "Phnom Penh",
    district: "Boeng Reang",
    transaction: "sale",
    propertyType: "condo",
    bedrooms: 0,
    bathrooms: 1,
    title: "Central Phnom Penh studio residence",
    price: 48888,
    currency: "USD",
    areaSqm: 32,
    image:
      "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=84",
    summary:
      "프놈펜 중심 생활권의 소형 스튜디오 매매 후보입니다. 예산 진입성이 좋지만 실제 임대료와 준공·소유권 자료 확인이 필요합니다.",
    trustScore: 72,
    trustStatus: "REVIEWING",
    isGliDirect: false,
    updatedAt: "2026-07-24T12:00:00+07:00",
    strengths: ["도심 생활권", "소형 임대 수요 후보", "초기 예산 진입성"],
    checks: ["외국인 소유 가능 층", "실제 임대료", "관리비와 공실률"],
  },
  {
    id: "GLI-KH-102",
    country: "Cambodia",
    countryCode: "KH",
    city: "Phnom Penh",
    district: "Boeng Reang",
    transaction: "sale",
    propertyType: "condo",
    bedrooms: 1,
    bathrooms: 1,
    title: "Central Phnom Penh 1BR residence",
    price: 75360,
    currency: "USD",
    areaSqm: 47,
    image:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=84",
    summary:
      "도심 생활권의 1베드룸 매매 후보입니다. 장기 임대와 계절 체류를 함께 검토할 수 있지만 운영 규정과 순수익 검증이 필요합니다.",
    trustScore: 74,
    trustStatus: "REVIEWING",
    isGliDirect: false,
    updatedAt: "2026-07-24T12:00:00+07:00",
    strengths: ["1인·커플 임대 수요", "중심지 접근성", "47㎡ 실용 평면"],
    checks: ["소유권 자료", "예상 임대료", "운영 규정"],
  },
  {
    id: "GLI-KH-103",
    country: "Cambodia",
    countryCode: "KH",
    city: "Phnom Penh",
    district: "BKK3",
    transaction: "sale",
    propertyType: "condo",
    bedrooms: 1,
    bathrooms: 1,
    title: "BKK3 future-completion 1BR condo",
    price: 75375,
    currency: "USD",
    areaSqm: 47,
    image:
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=84",
    summary:
      "BKK3의 향후 준공 예정 1베드룸입니다. 입지는 매력적이지만 공정률, 대금 일정과 개발사 이력을 먼저 검증해야 합니다.",
    trustScore: 61,
    trustStatus: "NEEDS_ATTENTION",
    isGliDirect: false,
    updatedAt: "2026-07-24T12:00:00+07:00",
    strengths: ["BKK3 입지", "신축 설계", "준공 후 임대 후보"],
    checks: ["공정률", "개발 인허가", "에스크로와 환불 조항"],
  },
  {
    id: "GLI-KH-104",
    country: "Cambodia",
    countryCode: "KH",
    city: "Phnom Penh",
    district: "BKK1",
    transaction: "rent",
    propertyType: "condo",
    bedrooms: 1,
    bathrooms: 1,
    title: "BKK1 high-floor 1BR condo",
    price: 700,
    currency: "USD",
    areaSqm: 56,
    image:
      "https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?auto=format&fit=crop&w=1200&q=84",
    summary:
      "BKK1 중심 생활권의 고층 1베드룸 임대 후보입니다. 3개월 체류에는 편리하지만 최소 계약 기간과 단기 전대 허용 여부를 확인해야 합니다.",
    trustScore: 82,
    trustStatus: "REVIEWING",
    isGliDirect: false,
    updatedAt: "2026-07-24T12:00:00+07:00",
    strengths: ["BKK1 생활 편의", "고층 전망", "가구 포함 후보"],
    checks: ["최소 계약 기간", "단기 전대 조항", "공과금"],
  },
  {
    id: "GLI-KH-105",
    country: "Cambodia",
    countryCode: "KH",
    city: "Phnom Penh",
    district: "Meanchey",
    transaction: "rent",
    propertyType: "condo",
    bedrooms: 1,
    bathrooms: 1,
    title: "Urban Village high-floor 1BR condo",
    price: 500,
    currency: "USD",
    areaSqm: 54,
    image:
      "https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?auto=format&fit=crop&w=1200&q=84",
    summary:
      "복합단지 내 고층 1베드룸입니다. 생활 편의와 커뮤니티 시설을 갖춘 장기 거주 후보로 GLI 현지 확인 프로그램을 준비 중입니다.",
    trustScore: 80,
    trustStatus: "REVIEWING",
    isGliDirect: true,
    updatedAt: "2026-07-24T12:00:00+07:00",
    strengths: ["복합단지 편의시설", "월 $500", "GLI 현지 확인 후보"],
    checks: ["관리비", "가구 목록", "현장 호실 확인"],
  },
  {
    id: "GLI-KH-004",
    country: "Cambodia",
    countryCode: "KH",
    city: "Phnom Penh",
    district: "Chrouy Changva",
    transaction: "rent",
    propertyType: "condo",
    bedrooms: 2,
    bathrooms: 2,
    title: "High-floor 2BR with Mekong River view",
    price: 500,
    currency: "USD",
    areaSqm: 74,
    image:
      "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=1200&q=84",
    summary:
      "메콩강 전망의 2베드룸 임대 후보입니다. 월 $500 예산과 장기 체류 조건에 잘 맞으며 관리비와 가구 포함 범위를 확인 중입니다.",
    trustScore: 81,
    trustStatus: "REVIEWING",
    isGliDirect: true,
    updatedAt: "2026-07-24T09:00:00+07:00",
    strengths: ["메콩강 전망", "2베드룸", "월 $500"],
    checks: ["관리비", "가구 인벤토리", "임대인 신원"],
  },
  {
    id: "GLI-KH-005",
    country: "Cambodia",
    countryCode: "KH",
    city: "Phnom Penh",
    district: "Boeng Trabek",
    transaction: "rent",
    propertyType: "condo",
    bedrooms: 1,
    bathrooms: 1,
    title: "15th-floor 1BR condo in Boeng Trabek",
    price: 380,
    currency: "USD",
    areaSqm: 50,
    image:
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=84",
    summary:
      "Boeng Trabek의 15층 1베드룸으로 예산 효율과 중심 생활권 접근성이 좋습니다. GLI 현지 확인 후보로 관리비를 검토 중입니다.",
    trustScore: 83,
    trustStatus: "REVIEWING",
    isGliDirect: true,
    updatedAt: "2026-07-24T09:00:00+07:00",
    strengths: ["월 $380", "50㎡", "도심 접근성"],
    checks: ["관리비", "인터넷 포함 여부", "호실 상태"],
  },
  {
    id: "GLI-KH-106",
    country: "Cambodia",
    countryCode: "KH",
    city: "Phnom Penh",
    district: "Chak Angrae Leu",
    transaction: "sale",
    propertyType: "condo",
    bedrooms: 1,
    bathrooms: 1,
    title: "Riverside compact condo residence",
    price: 86013,
    currency: "USD",
    areaSqm: 38,
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=84",
    summary:
      "강변 접근성이 있는 소형 콘도 매매 후보입니다. 휴가용 거점과 임대 운영을 함께 검토할 수 있지만 관리 계약과 운영 수수료 확인이 필요합니다.",
    trustScore: 69,
    trustStatus: "PRELIMINARY",
    isGliDirect: false,
    updatedAt: "2026-07-24T12:00:00+07:00",
    strengths: ["강변 접근성", "소형 관리", "휴가용 거점 후보"],
    checks: ["소유권 자료", "관리 계약", "단기 임대 허용"],
  },
];

export function findAsset(id: string): Asset | undefined {
  return assets.find((asset) => asset.id === id);
}
