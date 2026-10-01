// Approved listing sources only. Register new countries here so broad search
// and Gemini scouting expand together; a direct collector still needs an adapter.
export const DISCOVERY_COUNTRIES = {
  Cambodia: { code: "KH", domains: ["khmer24.com", "camrealtyservice.com", "cambodiaproperty.asia"] },
  Vietnam: { code: "VN", domains: ["dotproperty.com.vn"] },
  Philippines: { code: "PH", domains: ["dotproperty.com.ph"] },
} as const;

export type DiscoveryCountry = keyof typeof DISCOVERY_COUNTRIES;
export function isDiscoveryCountry(value: unknown): value is DiscoveryCountry {
  return typeof value === "string" && Object.hasOwn(DISCOVERY_COUNTRIES, value);
}
export function discoveryDomains(countries: readonly string[]): string[] {
  return countries.filter(isDiscoveryCountry).flatMap(country => [...DISCOVERY_COUNTRIES[country].domains]);
}
