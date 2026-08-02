import assert from "node:assert/strict";
import test from "node:test";

import {
  convertCurrency,
  displayCurrencyForLanguage,
  formatSourceMoney,
  formatSourceMoneyRange,
  formatConvertedMoneyRange,
  isPriceCurrency,
} from "../lib/currency.ts";

const rates = {
  USD: 1,
  KHR: 4_100,
  KRW: 1_400,
};

test("selects the converted currency from the platform language", () => {
  assert.equal(displayCurrencyForLanguage("ko-KR"), "KRW");
  assert.equal(displayCurrencyForLanguage("ko"), "KRW");
  assert.equal(displayCurrencyForLanguage("en-US"), "USD");
});

test("converts from the original source currency through the USD base", () => {
  assert.equal(convertCurrency(500, "USD", "KRW", rates), 700_000);
  assert.equal(convertCurrency(4_100_000, "KHR", "KRW", rates), 1_400_000);
  assert.equal(convertCurrency(4_100_000, "KHR", "USD", rates), 1_000);
  assert.equal(convertCurrency(500, "USD", "KRW", { USD: 1 }), null);
});

test("formats and validates supported source currencies", () => {
  assert.match(formatSourceMoney(4_100_000, "KHR"), /4[,.]100[,.]000/);
  assert.equal(isPriceCurrency("VND"), true);
  assert.equal(isPriceCurrency("BTC"), false);
});

test("formats long source and converted price ranges compactly", () => {
  assert.equal(
    formatSourceMoneyRange(1_352_000, 3_174_000, "MYR"),
    "RM 1,352K~3,174K",
  );
  assert.match(
    formatConvertedMoneyRange(476_000_000, 1_118_000_000, "KRW", "ko-KR"),
    /₩4\.8억~₩11\.2억/,
  );
});
