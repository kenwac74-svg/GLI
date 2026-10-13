import type { DashboardFavorite } from "../db/user-workflows.ts";
import type { Candidate } from "./consultation-view.ts";

type FavoriteResponse = {
  ok: boolean; status: number; error?: string; signInPath?: string;
  favorites?: DashboardFavorite[];
};
async function responseData(response: Response): Promise<FavoriteResponse> {
  const body = await response.json();
  return { ...body, ok: response.ok, status: response.status };
}

// Database authority stays behind this API; AWS migration replaces the server adapter.
export async function readFavorites(fetcher: typeof fetch = fetch): Promise<FavoriteResponse> {
  return responseData(await fetcher("/api/favorites", { cache: "no-store" }));
}
export async function writeFavorite(assetId: string, save: boolean, fetcher: typeof fetch = fetch): Promise<FavoriteResponse> {
  return responseData(await fetcher("/api/favorites", {
    method: save ? "POST" : "DELETE", headers: { "content-type": "application/json" },
    body: JSON.stringify({ assetId }),
  }));
}
export function favoriteCandidate(row: DashboardFavorite): Candidate {
  return { id: row.publicId, title: row.title, country: row.country, city: row.city,
    favoriteRefId:row.referenceId ?? row.publicId,detailOrigin:row.detailOrigin ?? "search",
    retainedStatus: row.transactionState==="completed" ? "거래 완료" : row.sourceState==="removed" ? "원문 삭제" : row.sourceState==="check_failed" ? "원문 확인 필요" : row.retained ? "보관된 정보" : undefined,
    district: row.district ?? "", transaction: row.transactionType === "rent" ? "rent" : "sale",
    price: row.priceMinor / 100, currency: row.currency, image: row.imageUrl ?? "",
    ...(row.maxPriceMinor!==undefined ? {maxPrice:row.maxPriceMinor/100}:{}),priceLabel:row.priceLabel,
    trustScore: row.trustScore, areaSqm: (row.areaSqmX100 ?? 0) / 100,
    bedrooms: row.bedrooms ?? null, bathrooms: row.bathrooms ?? null };
}
