import { createAssetsRepository } from "../db/assets-repository.ts";
import { assets, type Asset } from "./assets.ts";
import type { PublicAssetsFilters } from "../db/assets-repository.ts";

export type AssetDataMode = "approved-fixture" | "d1";

export type AssetDataResult = {
  assets: Asset[];
  mode: AssetDataMode;
};

type RuntimeEnv = {
  DATA_MODE?: string;
};

export function getAssetDataMode(
  runtimeEnv: RuntimeEnv = process.env,
): AssetDataMode {
  const mode = runtimeEnv.DATA_MODE ?? "approved-fixture";
  if (mode !== "approved-fixture" && mode !== "d1") {
    throw new Error(`Unsupported DATA_MODE: ${mode}`);
  }
  return mode;
}

export async function listAssets(
  filters: PublicAssetsFilters = {},
): Promise<AssetDataResult> {
  const mode = getAssetDataMode();
  if (mode === "approved-fixture") {
    return {
      assets: filterFixtureAssets(filters),
      mode,
    };
  }

  const { getD1PublicListingQuery } = await import("../db/d1-assets-query.ts");
  const repository = createAssetsRepository(await getD1PublicListingQuery());
  return {
    assets: await repository.listPublicAssets(filters),
    mode,
  };
}

export async function getAsset(publicId: string): Promise<{
  asset: Asset | null;
  mode: AssetDataMode;
}> {
  const result = await listAssets({ limit: 100 });
  return {
    asset: result.assets.find((candidate) => candidate.id === publicId) ?? null,
    mode: result.mode,
  };
}

function filterFixtureAssets(filters: PublicAssetsFilters): Asset[] {
  return assets
    .filter(
      (asset) =>
        (!filters.country || asset.country === filters.country) &&
        (!filters.city || asset.city === filters.city) &&
        (!filters.transaction || asset.transaction === filters.transaction) &&
        (!filters.propertyType || asset.propertyType === filters.propertyType) &&
        (filters.minPrice === undefined || asset.price >= filters.minPrice) &&
        (filters.maxPrice === undefined || asset.price <= filters.maxPrice) &&
        (filters.minBedrooms === undefined ||
          asset.bedrooms >= filters.minBedrooms),
    )
    .slice(0, filters.limit ?? 50);
}
