import type { Asset, TrustStatus } from "../lib/assets";

export type PublicAssetsFilters = { country?: string; city?: string; transaction?: Asset["transaction"]; propertyType?: Asset["propertyType"]; minPrice?: number; maxPrice?: number; minBedrooms?: number; limit?: number };
export type PublicAssetsQuery = { status: "ACTIVE"; country?: string; city?: string; transactionType?: Asset["transaction"]; propertyType?: Asset["propertyType"]; minPriceMinor?: number; maxPriceMinor?: number; minBedrooms?: number; limit: number };
export type QueryPublicListingRows = (query: PublicAssetsQuery) => Promise<readonly unknown[]>;

const codes: Record<string,string> = { Cambodia:"KH", Indonesia:"ID", Malaysia:"MY", Philippines:"PH", Singapore:"SG", Thailand:"TH", Vietnam:"VN" };
const trustStatuses = new Set<TrustStatus>(["PRELIMINARY","REVIEWING","VERIFIED","NEEDS_ATTENTION"]);
const record = (value: unknown) => { if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("listing row must be an object"); return value as Record<string,unknown>; };
const get = (row: Record<string,unknown>, ...keys: string[]) => { for (const key of keys) if (Object.hasOwn(row,key)) return row[key]; return undefined; };
const text = (value: unknown, field: string) => { if (typeof value !== "string" || !value.trim()) throw new TypeError(`${field} must be a non-empty string`); return value.trim(); };
const integer = (value: unknown, field: string) => { if (!Number.isSafeInteger(value) || (value as number) < 0) throw new TypeError(`${field} must be a non-negative safe integer`); return value as number; };
const nullableInteger = (value: unknown, field: string) => value == null ? null : integer(value,field);
const jsonStrings = (value: unknown, field: string) => { if (value == null) return []; const parsed = typeof value === "string" ? JSON.parse(value) : value; if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string" || !item.trim())) throw new TypeError(`${field} must contain strings`); return parsed.map((item) => item.trim()); };
const timestamp = (value: unknown) => { const date = value instanceof Date ? value : new Date(value as string | number); if (Number.isNaN(date.getTime())) throw new TypeError("updatedAt must be a valid timestamp"); return date.toISOString(); };

export function buildPublicAssetsQuery(filters: PublicAssetsFilters = {}): PublicAssetsQuery {
  const limit = filters.limit ?? 50;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new RangeError("limit must be an integer between 1 and 100");
  if (filters.minPrice !== undefined && filters.maxPrice !== undefined && filters.minPrice > filters.maxPrice) throw new RangeError("minPrice cannot exceed maxPrice");
  for (const [name,value] of [["minPrice",filters.minPrice],["maxPrice",filters.maxPrice]] as const) if (value !== undefined && (!Number.isFinite(value) || value < 0)) throw new RangeError(`${name} must be non-negative`);
  return { status:"ACTIVE", country:filters.country?.trim(), city:filters.city?.trim(), transactionType:filters.transaction, propertyType:filters.propertyType, minPriceMinor:filters.minPrice === undefined ? undefined : Math.round(filters.minPrice*100), maxPriceMinor:filters.maxPrice === undefined ? undefined : Math.round(filters.maxPrice*100), minBedrooms:filters.minBedrooms, limit };
}

export function mapListingRowToAsset(input: unknown): Asset {
  const row = record(input); const id = text(get(row,"publicId","public_id"),"publicId"); const status = text(get(row,"status"),"status"); if (status !== "ACTIVE") throw new Error(`Listing ${id} is not public`);
  const country = text(get(row,"country"),"country"); const countryCode = (get(row,"countryCode","country_code") as string | null) ?? codes[country]; if (!countryCode || !/^[A-Z]{2}$/.test(countryCode)) throw new Error(`Listing ${id} has no valid ISO country code`);
  const transaction = text(get(row,"transactionType","transaction_type"),"transactionType") as Asset["transaction"]; if (!new Set(["sale","rent"]).has(transaction)) throw new Error("unsupported transactionType");
  const propertyType = text(get(row,"propertyType","property_type"),"propertyType") as Asset["propertyType"]; if (!new Set(["condo","house","villa"]).has(propertyType)) throw new Error("unsupported propertyType");
  const currency = text(get(row,"currency"),"currency"); if (currency !== "USD") throw new Error("unsupported currency");
  const boolean = get(row,"isGliDirect","is_gli_direct"); if (![true,false,0,1].includes(boolean as never)) throw new TypeError("isGliDirect must be a boolean or 0/1");
  const trustScore = nullableInteger(get(row,"trustScore","trust_score"),"trustScore") ?? 0; if (trustScore > 100) throw new RangeError("trustScore must be between 0 and 100");
  const trustStatus = (get(row,"trustStatus","trust_status") ?? "PRELIMINARY") as TrustStatus; if (!trustStatuses.has(trustStatus)) throw new Error("unsupported trustStatus");
  return { id, country, countryCode, city:text(get(row,"city"),"city"), district:(get(row,"district") as string | null) ?? "", transaction, propertyType, bedrooms:nullableInteger(get(row,"bedrooms"),"bedrooms") ?? 0, bathrooms:nullableInteger(get(row,"bathrooms"),"bathrooms") ?? 0, title:text(get(row,"title"),"title"), price:integer(get(row,"priceMinor","price_minor"),"priceMinor")/100, currency:"USD", areaSqm:(nullableInteger(get(row,"areaSqmX100","area_sqm_x100"),"areaSqmX100") ?? 0)/100, image:(get(row,"imageUrl","image_url") as string | null) ?? "", summary:text(get(row,"summary"),"summary"), trustScore, trustStatus, isGliDirect:boolean === true || boolean === 1, updatedAt:timestamp(get(row,"updatedAt","updated_at")), strengths:jsonStrings(get(row,"strengths","strengthsJson","strengths_json"),"strengths"), checks:jsonStrings(get(row,"checks","checksJson","checks_json"),"checks") };
}

export function createAssetsRepository(queryRows: QueryPublicListingRows) {
  if (typeof queryRows !== "function") throw new TypeError("queryRows must be a function");
  return { async listPublicAssets(filters: PublicAssetsFilters = {}) { const query=buildPublicAssetsQuery(filters); const rows=await queryRows(query); if (!Array.isArray(rows)) throw new TypeError("data source must return rows"); return rows.map(mapListingRowToAsset).filter((asset) => (!query.country||asset.country===query.country)&&(!query.city||asset.city===query.city)&&(!query.transactionType||asset.transaction===query.transactionType)&&(!query.propertyType||asset.propertyType===query.propertyType)&&(query.minPriceMinor===undefined||asset.price*100>=query.minPriceMinor)&&(query.maxPriceMinor===undefined||asset.price*100<=query.maxPriceMinor)&&(query.minBedrooms===undefined||asset.bedrooms>=query.minBedrooms)).sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt)||b.trustScore-a.trustScore||a.price-b.price||a.id.localeCompare(b.id)).slice(0,query.limit); } };
}
