"use client";

import { useEffect, useMemo, useState } from "react";
import {
  convertCurrency,
  displayCurrencyForLanguage,
  formatConvertedMoney,
  formatConvertedMoneyRange,
  formatSourceMoney,
  formatSourceMoneyRange,
  type ExchangeRateSnapshot,
  type PriceCurrency,
} from "../../lib/currency";

let exchangeRateRequest: Promise<ExchangeRateSnapshot | null> | null = null;

type PriceDisplayProps = {
  amount: number;
  maxAmount?: number;
  currency: PriceCurrency;
  contextLabel: string;
  originalLabel?: string;
  className?: string;
  showAttribution?: boolean;
};

export function PriceDisplay({
  amount,
  maxAmount,
  currency,
  contextLabel,
  originalLabel,
  className = "price-display",
  showAttribution = false,
}: PriceDisplayProps) {
  const [language] = useState(() => {
    if (typeof document === "undefined") return "ko-KR";
    return document.documentElement.lang || navigator.language || "en";
  });
  const [snapshot, setSnapshot] = useState<ExchangeRateSnapshot | null>(null);

  useEffect(() => {
    if (!exchangeRateRequest) exchangeRateRequest = loadExchangeRates();
    void exchangeRateRequest.then(setSnapshot);
  }, []);

  const targetCurrency = displayCurrencyForLanguage(language);
  const converted = useMemo(
    () =>
      snapshot && amount > 0
        ? convertCurrency(amount, currency, targetCurrency, snapshot.rates)
        : null,
    [amount, currency, snapshot, targetCurrency],
  );
  const convertedMaximum = useMemo(
    () =>
      snapshot && maxAmount && maxAmount > amount
        ? convertCurrency(maxAmount, currency, targetCurrency, snapshot.rates)
        : null,
    [amount, currency, maxAmount, snapshot, targetCurrency],
  );
  const hasRange = Boolean(maxAmount && maxAmount > amount);
  const originalPrice = hasRange && maxAmount
    ? formatSourceMoneyRange(amount, maxAmount, currency)
    : originalLabel ?? formatSourceMoney(amount, currency);

  return (
    <div className={className}>
      <small>{contextLabel}</small>
      <strong>{originalPrice}</strong>
      {converted !== null && targetCurrency !== currency ? (
        <span className="price-converted">
          약 {convertedMaximum !== null
            ? formatConvertedMoneyRange(
                converted,
                convertedMaximum,
                targetCurrency,
                language,
              )
            : formatConvertedMoney(converted, targetCurrency, language)}
        </span>
      ) : null}
      {showAttribution && snapshot ? (
        <a
          className="fx-source"
          href="https://www.exchangerate-api.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          참고 환율 · {new Date(snapshot.updatedAt).toLocaleDateString(language)}
        </a>
      ) : null}
    </div>
  );
}

async function loadExchangeRates(): Promise<ExchangeRateSnapshot | null> {
  try {
    const response = await fetch("/api/exchange-rates", {
      headers: { accept: "application/json" },
    });
    if (!response.ok) return null;
    return (await response.json()) as ExchangeRateSnapshot;
  } catch {
    return null;
  }
}
