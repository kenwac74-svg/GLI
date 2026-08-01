"use client";

import { useEffect, useMemo, useState } from "react";
import {
  convertCurrency,
  displayCurrencyForLanguage,
  formatConvertedMoney,
  formatSourceMoney,
  type ExchangeRateSnapshot,
  type PriceCurrency,
} from "../../lib/currency";

let exchangeRateRequest: Promise<ExchangeRateSnapshot | null> | null = null;

type PriceDisplayProps = {
  amount: number;
  currency: PriceCurrency;
  contextLabel: string;
  originalLabel?: string;
  className?: string;
  showAttribution?: boolean;
};

export function PriceDisplay({
  amount,
  currency,
  contextLabel,
  originalLabel,
  className = "price-display",
  showAttribution = false,
}: PriceDisplayProps) {
  const [language, setLanguage] = useState("ko-KR");
  const [snapshot, setSnapshot] = useState<ExchangeRateSnapshot | null>(null);

  useEffect(() => {
    const documentLanguage = document.documentElement.lang || navigator.language || "en";
    setLanguage(documentLanguage);
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
  const originalPrice = originalLabel ?? formatSourceMoney(amount, currency);

  return (
    <div className={className}>
      <small>{contextLabel}</small>
      <strong>{originalPrice}</strong>
      {converted !== null && targetCurrency !== currency ? (
        <span className="price-converted">
          약 {formatConvertedMoney(converted, targetCurrency, language)}
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
