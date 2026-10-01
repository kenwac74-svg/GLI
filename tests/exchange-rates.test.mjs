import assert from "node:assert/strict";
import test from "node:test";
import { getExchangeRates } from "../lib/exchange-rates.ts";

const payload = { result: "success", rates: { USD: 1, KRW: 1400, VND: 25000 }, time_last_update_unix: 1790726400 };

test("shared FX supports edge redirect modes and retains provider timestamp", async () => {
  const result = await getExchangeRates(async (url, options) => {
    assert.equal(String(url), "https://open.er-api.com/v6/latest/USD");
    assert.equal(options.redirect, "manual");
    return Response.json(payload);
  });
  assert.equal(result.snapshot.rates.VND, 25000);
  assert.equal(result.snapshot.updatedAt, new Date(payload.time_last_update_unix * 1000).toISOString());
});

test("invalid or undated FX cannot be used as a budget reference", async () => {
  assert.equal(await getExchangeRates(async () => Response.json({ ...payload, time_last_update_unix: undefined })), null);
  assert.equal(await getExchangeRates(async () => Response.json({ ...payload, rates: { USD: 0, KRW: 1400 } })), null);
});

test("FX redirects are refused without following another host", async () => {
  let calls = 0;
  assert.equal(await getExchangeRates(async () => { calls++; return new Response(null, { status: 302 }); }), null);
  assert.equal(calls, 1);
});
