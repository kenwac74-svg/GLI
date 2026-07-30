import type { NormalizationInput } from "./normalize.ts";

export const APPROVED_FIXTURE_REQUESTED_FIELDS = [
  "externalId",
  "title",
  "summary",
  "price",
  "currency",
  "areaSqm",
  "bedrooms",
  "bathrooms",
  "imageUrl",
  "observedAt",
] as const;

export function createApprovedDemoFeed(
  observedAt = new Date().toISOString(),
): NormalizationInput[] {
  return [
    {
      country: "Cambodia",
      city: "Phnom Penh",
      district: "Chrouy Changva",
      transaction: "rent",
      propertyType: "condo",
      price: 500,
      currency: "USD",
      areaSqm: 74,
      bedrooms: 2,
      bathrooms: 2,
      imageUrl:
        "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=1200&q=84",
      title: "High-floor 2BR with Mekong River view",
      summary:
        "메콩강 전망의 가구 포함 2베드룸 임대 후보입니다. 관리비와 계약 조건은 현장 검토가 필요합니다.",
      sourceExternalKey: "gli-kh-004",
      sourceUrl:
        "https://fixtures.glibiz.local/listings/gli-kh-004",
      observedAt,
    },
    {
      country: "Cambodia",
      city: "Phnom Penh",
      district: "Tonle Bassac",
      transaction: "rent",
      propertyType: "condo",
      price: 650,
      currency: "USD",
      areaSqm: 62,
      bedrooms: 1,
      bathrooms: 1,
      imageUrl:
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=84",
      title: "Tonle Bassac serviced 1BR residence",
      summary:
        "톤레바삭 생활권의 가구 포함 1베드룸 임대 후보입니다. 단기 체류 규정과 운영 수수료는 추가 확인이 필요합니다.",
      sourceExternalKey: "approved-demo-kh-201",
      sourceUrl:
        "https://fixtures.glibiz.local/listings/approved-demo-kh-201",
      observedAt,
    },
  ];
}
