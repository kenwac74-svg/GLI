export const PRICE_CURRENCIES = [
  "USD",
  "KHR",
  "VND",
  "PHP",
  "THB",
  "IDR",
  "MYR",
  "SGD",
  "KRW",
] as const;

export type PriceCurrency = (typeof PRICE_CURRENCIES)[number];
export type DisplayCurrency = "KRW" | "USD";

export type ExchangeRateSnapshot = {
  baseCurrency: "USD";
  rates: Partial<Record<PriceCurrency, number>>;
  updatedAt: string;
  nextUpdateAt: string | null;
  provider: "ExchangeRate-API";
};

const SOURCE_LOCALES: Record<PriceCurrency, string> = {
  USD: "en-US",
  KHR: "km-KH",
  VND: "vi-VN",
  PHP: "en-PH",
  THB: "th-TH",
  IDR: "id-ID",
  MYR: "ms-MY",
  SGD: "en-SG",
  KRW: "ko-KR",
};

export function displayCurrencyForLanguage(language: string): DisplayCurrency {
  return language.toLocaleLowerCase("en-US").startsWith("ko") ? "KRW" : "USD";
}

export function formatSourceMoney(amount: number, currency: PriceCurrency): string {
  return new Intl.NumberFormat(SOURCE_LOCALES[currency], {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

export function formatSourceMoneyRange(
  minimum: number,
  maximum: number,
  currency: PriceCurrency,
): string {
  const divisor = maximum >= 10_000_000 ? 1_000_000 : 1_000;
  const suffix = divisor === 1_000_000 ? "M" : "K";
  const locale = SOURCE_LOCALES[currency];
  const currencyPart = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  })
    .formatToParts(0)
    .find((part) => part.type === "currency")?.value ?? currency;
  const number = new Intl.NumberFormat(locale, {
    maximumFractionDigits: divisor === 1_000_000 ? 1 : 0,
  });

  return `${currencyPart} ${number.format(minimum / divisor)}${suffix}~${number.format(maximum / divisor)}${suffix}`;
}

export function formatConvertedMoney(
  amount: number,
  currency: DisplayCurrency,
  language: string,
): string {
  return new Intl.NumberFormat(language.startsWith("ko") ? "ko-KR" : "en-US", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatConvertedMoneyRange(
  minimum: number,
  maximum: number,
  currency: DisplayCurrency,
  language: string,
): string {
  const locale = language.startsWith("ko") ? "ko-KR" : "en-US";
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    notation: "compact",
    maximumFractionDigits: 1,
  });
  return `${formatter.format(minimum)}~${formatter.format(maximum)}`;
}

export function convertCurrency(
  amount: number,
  sourceCurrency: PriceCurrency,
  targetCurrency: DisplayCurrency,
  rates: ExchangeRateSnapshot["rates"],
): number | null {
  if (!Number.isFinite(amount) || amount < 0) return null;
  if (sourceCurrency === targetCurrency) return amount;

  const sourceRate = rates[sourceCurrency];
  const targetRate = rates[targetCurrency];
  if (
    typeof sourceRate !== "number" ||
    sourceRate <= 0 ||
    typeof targetRate !== "number" ||
    targetRate <= 0
  ) {
    return null;
  }

  return (amount / sourceRate) * targetRate;
}

export function isPriceCurrency(value: unknown): value is PriceCurrency {
  return (
    typeof value === "string" &&
    PRICE_CURRENCIES.includes(value as PriceCurrency)
  );
}
