import type { Asset } from "./assets.ts";
export type IdentityEvidence = {
  kind: "exact_unit_identifier"; issuer: string; propertyId: string; unitId: string; basisUrls: string[];
};
const fact = (asset: Asset, label: string) => asset.detailFacts?.find(f => f.label.trim().toLowerCase() === label.toLowerCase())?.value;

// Stored, issuer-scoped identifiers are necessary; similarity is never proof.
export async function confirmedIdentityGroup(assets: Asset[], evidence: IdentityEvidence): Promise<string> {
  if (assets.length < 2 || assets.length > 20 || evidence.kind !== "exact_unit_identifier"
    || !evidence.issuer?.trim() || !evidence.propertyId?.trim() || !evidence.unitId?.trim()) throw new TypeError("Missing exact unit evidence");
  for (const asset of assets) {
    if (!asset.sourceUrl || !evidence.basisUrls.includes(asset.sourceUrl)
      || fact(asset,"ID issuer") !== evidence.issuer || fact(asset,"Property ID") !== evidence.propertyId
      || fact(asset,"Unit ID") !== evidence.unitId || asset.countryCode !== assets[0].countryCode
      || asset.transaction !== assets[0].transaction) throw new TypeError("Unconfirmed or incompatible unit identity");
  }
  const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify([
    evidence.issuer,evidence.propertyId,evidence.unitId,assets[0].countryCode,assets[0].transaction])));
  return `group_${Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("")}`;
}
