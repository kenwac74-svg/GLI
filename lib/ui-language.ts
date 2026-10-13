import { ENGLISH_UI_COPY } from "./english-ui-copy.ts";

export type UiLocale = "ko" | "en";
export const UI_LOCALE_COOKIE = "gli-locale";
export function uiLocale(value: unknown): UiLocale { return value === "en" ? "en" : "ko"; }

// Fixed public copy only. Never translate user inputs, rewrite stored facts,
// execute remote translation or guess an unknown project/brand name.
export function translateUiText(text: string, locale: UiLocale): string {
  if (locale === "ko") return text;
  const key = text.trim().replace(/\s+/g, " ");
  const translated = ENGLISH_UI_COPY[key];
  if (translated) return text.replace(text.trim(), translated);
  const patterns: [RegExp, string][] = [
    [/^(FREE|BASIC|STANDARD|PREMIUM|BUSINESS) 들여다보기$/, "Preview $1"],
    [/^다음 단계는 (FREE|BASIC|STANDARD|PREMIUM|BUSINESS)입니다[.。]?$/, "The next level is $1."],
    [/^(\d{4})년 (\d{1,2})월 (\d{1,2})일$/, "$1-$2-$3"],
    [/^(\d+)건의 후보$/, "$1 candidates"],
    [/^전체 결과 (\d+)건 보기$/, "View all $1 results"],
    [/^(\d+)건의 후보 탐색을 완료했습니다$/, "Found $1 candidates"],
    [/^출처 (\d+)건$/, "$1 sources"],
    [/^원문 자료 조사 예정 (\d+)건$/, "$1 sources pending"],
    [/^(\d+)위$/, "#$1"],
    [/^추천 (\d+)위$/, "Rank #$1"],
    [/^조건에 맞는 후보 (\d+)건$/, "$1 matching candidates"],
    [/^원화 환산 미확인$/, "Currency conversion unavailable"],
  ];
  for (const [pattern, replacement] of patterns) if (pattern.test(key)) return text.replace(text.trim(), key.replace(pattern, replacement));
  return text;
}
