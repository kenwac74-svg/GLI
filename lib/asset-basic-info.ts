import type { Asset } from "./assets.ts";

export function bedroomLabel(value: number | null): string {
  return value === null ? "침실 미확인" : value === 0 ? "스튜디오" : `${value}BR`;
}

export function basicDetailFacts(asset: Asset, locale: "ko" | "en" = "ko") {
  const residentialFacts = [
    { label: "면적", value: asset.areaSqm ? `${asset.areaSqm}㎡` : "미확인" },
    { label: "침실", value: bedroomLabel(asset.bedrooms) },
    { label: "욕실", value: asset.bathrooms === null ? "미확인" : String(asset.bathrooms) },
  ];
  const facts = [
    ...(!asset.assetCategory || asset.assetCategory === "residential" ? residentialFacts : []),
    ...(asset.detailFacts ?? []).filter(fact => !["면적", "침실", "욕실", "자료 기준", "마지막 자료 갱신", "원문 게시일", "원문 갱신일", "GLI 수집/확인일"].includes(fact.label)),
  ];
  const external = Boolean(asset.sourceUrl && !asset.isGliDirect);
  return [...facts,
    { label: "원문 게시일", value: dateLabel(asset.sourcePublishedAt, locale) },
    { label: external ? "원문 갱신일" : "자료 갱신일", value: dateLabel(external ? asset.sourceUpdatedAt : asset.updatedAt, locale) },
    { label: "GLI 수집/확인일", value: dateLabel(asset.sourceObservedAt, locale) },
  ];
}

function dateLabel(value?: string, locale: "ko" | "en" = "ko"): string {
  return value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString(locale === "en" ? "en-US" : "ko-KR", { timeZone: "Asia/Seoul" }) + (locale === "en" ? " KST" : "") : "미확인";
}
