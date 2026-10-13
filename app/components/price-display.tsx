"use client";

import { useEffect, useMemo, useState } from "react";
import { useUiLocale } from "./ui-locale-provider";
import { referenceExchangeRates } from "../../lib/reference-exchange-rates";
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
  const { locale } = useUiLocale();
  const language = locale === "en" ? "en-US" : "ko-KR";
  const [snapshot, setSnapshot] = useState<ExchangeRateSnapshot | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    void referenceExchangeRates().then(result => { if (active) { setSnapshot(result); setLoaded(true); } });
    return () => { active = false; };
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
          {locale === "en" ? "Approx. " : "약 "}{convertedMaximum !== null
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
          {locale === "en" ? "Reference FX · " : "참고 환율 · "}{new Date(snapshot.updatedAt).toLocaleString(language, { timeZone: "Asia/Seoul" })}{locale === "en" ? " KST" : ""}
        </a>
      ) : null}
      {amount > 0 && targetCurrency !== currency && converted === null ? (
        <span className="price-converted">{locale === "en" ? loaded ? "Conversion unavailable · original price shown" : "Loading reference exchange rate" : loaded ? "원화 환산 미확인 · 원문 가격 표시" : "참고 환율 조회 중"}</span>
      ) : null}
    </div>
  );
}
