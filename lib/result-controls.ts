export const RESULT_VIEW_KEY = "gli:result-view";
export const resultViewMode = (value: string | null) => value === "list" ? "list" : "grid";
const countries: Record<string, string> = {
  KH: "KH", Cambodia: "KH", 캄보디아: "KH", VN: "VN", Vietnam: "VN", 베트남: "VN",
  PH: "PH", Philippines: "PH", 필리핀: "PH", MY: "MY", Malaysia: "MY", 말레이시아: "MY",
};
export const countryCode = (value: string) => countries[value] ?? "";
export function resultFilterPath(search: string, param?: string, value?: string) {
  const params = new URLSearchParams(search);
  params.delete("q"); // Local presentation changes never trigger another paid search.
  if (param === "country") params.delete("cc");
  if (param) {
    if (!value || value === "ALL" || (param === "cat" && params.get(param) === value)) params.delete(param);
    else params.set(param, value);
  } else params.delete("cat");
  const query = params.toString();
  return `/explore${query ? `?${query}` : ""}`;
}
export type ResultMetadata = { country: string; transaction?: string; category?: string; recommended?: boolean };
export function matchesResultFilters(item: ResultMetadata, params: URLSearchParams) {
  const country = params.get("country") ?? params.get("cc");
  const category = params.get("cat");
  const transaction = params.get("txn");
  return (!country || country === "ALL" || countryCode(item.country) === country)
    && (!category || category === "ALL" || item.category === category)
    && (!transaction || transaction === "ALL" || (transaction === "REC" ? item.recommended === true
      : item.transaction === (transaction === "매매" ? "sale" : transaction === "임대" ? "rent" : transaction)));
}
