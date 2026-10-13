export const ACCESS_PREVIEW_NAMES = ["FREE", "BASIC", "STANDARD", "PREMIUM", "BUSINESS"] as const;
export function accessPreviewTier(value: string) {
  const index = ACCESS_PREVIEW_NAMES.findIndex(name => name.toLowerCase() === value.toLowerCase());
  return index < 0 ? null : index;
}
export const canPreviewTier = (external: boolean, resourceCount: number, tier: number) =>
  tier === 0 || !external || resourceCount > 0;
