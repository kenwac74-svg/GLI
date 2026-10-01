// GS-033 / P40: display only; canonical geography remains available to filters.
const PLACES: Record<string, string> = {
  Cambodia: "캄보디아", Vietnam: "베트남", Philippines: "필리핀", Malaysia: "말레이시아",
  "Phnom Penh": "프놈펜", Sihanoukville: "시하누크빌", "Siem Reap": "시엠립",
  "Ho Chi Minh City": "호치민", "Ho Chi Minh": "호치민", Hanoi: "하노이", "Ha Noi": "하노이",
  "Da Nang": "다낭", "Nha Trang": "나트랑", "Binh Trung Tay": "빈쯩떠이",
  "Ben Nghe": "벤응에", "An Phu": "안푸", "Thu Duc": "투득",
  Manila: "마닐라", "Metro Manila": "메트로 마닐라", Makati: "마카티", Cebu: "세부",
  "Cebu City": "세부", Taguig: "타기그", Parañaque: "파라냐케", Pasig: "파시그",
  Mandaluyong: "만달루용", "Quezon City": "케손시티", "Lapu-Lapu": "라푸라푸",
  Angeles: "앙헬레스", Pampanga: "팜팡가", Urdaneta: "우르다네타", Pangasinan: "팡가시난",
};

export function geographyLabel(value: string) {
  const trimmed = value.trim();
  const district = /^District\s+(\d+)$/i.exec(trimmed);
  return PLACES[trimmed] ?? (district ? `${district[1]}군` : trimmed);
}

export function candidateLocation(asset: { district: string; city: string; country: string }) {
  return [asset.district, asset.city, asset.country].filter(Boolean).map(geographyLabel).join(", ");
}

export function localizeSeparatedGeography(text: string): string {
  // Quoted names are indivisible. Only isolated, known place segments change;
  // R&F City Phnom Penh and R&FCityPhnomPenh are never split speculatively.
  return text.split(/(https?:\/\/[^\s<>]+|"[^"]*"|'[^']*'|“[^”]*”|‘[^’]*’)/g).map((part, index) => index % 2 ? part
    : part.split(/([,;|·/])/g).map((segment, i) => i % 2 ? segment
      : segment.replace(/^(\s*)(.*?)(\s*)$/, (_, before, value, after) => `${before}${geographyLabel(value)}${after}`)).join("")
  ).join("");
}
