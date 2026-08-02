export const EXPLORE_RETURN_KEY = "gli:explore-return";
export const EXPLORE_STATE_KEY = "gli:explore-state";
export const EXPLORE_STATE_MAX_AGE_MS = 2 * 60 * 60 * 1_000;

export function rememberExploreResult(assetId: string) {
  window.sessionStorage.setItem(
    EXPLORE_RETURN_KEY,
    JSON.stringify({ assetId, createdAt: Date.now() }),
  );
}
