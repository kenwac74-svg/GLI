import assert from "node:assert/strict";
import test from "node:test";

import { discoverCambodiaAssets } from "../lib/cambodia-live-discovery.ts";

const NOW = new Date("2026-08-02T03:00:00.000Z");
const WP_ROBOTS = "User-agent: *\nAllow: /wp-json/\n";
const KHMER_ROBOTS =
  "User-agent: *\nContent-Signal: search=yes,ai-train=no,use=reference\nAllow: /\n";
const KHMER_HTML = `<!doctype html><html><body><a href="/en/riverside-condo-adid-9001" class="post bg-white"><img src="https://www.khmer24.com/demo.jpg"><p class="title">Riverside condo for rent</p><div class="date-location"><p>1h • មានជ័យ, ភ្នំពេញ</p><p>Rent • Bedroom 2 • Bathroom 1 • 67m²</p></div><strong>$360</strong></a></body></html>`;

function wordpressProperty(host, id) {
  return {
    id,
    modified_gmt: "2026-08-02T02:00:00",
    link: `https://${host}/en/property/phnom-penh-condo-for-rent/`,
    title: { rendered: `BKK1 Condo ${id} For Rent` },
    property_meta: {
      REAL_HOMES_property_price: "650",
      REAL_HOMES_property_size: "72",
      REAL_HOMES_property_bedrooms: "2",
      REAL_HOMES_property_bathrooms: "2",
      REAL_HOMES_property_address: "BKK1, Khan Boeng Keng Kang, Phnom Penh",
      REAL_HOMES_property_type: "Apartment",
      REAL_HOMES_property_price_postfix: "per month",
    },
    _embedded: {
      "wp:featuredmedia": [{ source_url: `https://${host}/media/${id}.jpg` }],
    },
  };
}

test("collects and attributes the three approved Cambodia discovery sources", async () => {
  const requests = [];
  const result = await discoverCambodiaAssets({
    now: () => NOW,
    cacheTtlMs: 1,
    fetchImpl: async (input) => {
      const url = new URL(String(input));
      requests.push(url.toString());
      if (url.pathname === "/robots.txt") {
        return new Response(
          url.hostname === "www.khmer24.com" ? KHMER_ROBOTS : WP_ROBOTS,
          { status: 200, headers: { "content-type": "text/plain" } },
        );
      }
      if (url.hostname === "www.khmer24.com") {
        return new Response(KHMER_HTML, {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
      const id = url.hostname === "camrealtyservice.com" ? 7101 : 7201;
      return new Response(JSON.stringify([wordpressProperty(url.hostname, id)]), {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    },
  });

  assert.equal(result.assets.length, 3);
  assert.deepEqual(
    result.sources.map((source) => [source.name, source.status, source.count]),
    [
      ["CAM Realty", "collected", 1],
      ["Cambodia Property Asia", "collected", 1],
      ["Khmer24", "collected", 1],
    ],
  );
  assert.deepEqual(
    new Set(result.assets.map((asset) => asset.sourceName)),
    new Set(["CAM Realty", "Cambodia Property Asia", "Khmer24"]),
  );
  assert.ok(result.assets.every((asset) => asset.sourceUrl?.startsWith("https://")));
  assert.ok(requests.some((url) => url.includes("camrealtyservice.com/wp-json/")));
  assert.ok(requests.some((url) => url.includes("cambodiaproperty.asia/wp-json/")));
  assert.ok(requests.some((url) => url.includes("khmer24.com/en/c-property")));
});

test("uses source snapshots when upstream collectors are temporarily unavailable", async () => {
  const result = await discoverCambodiaAssets({
    now: () => new Date("2026-08-02T03:01:00.000Z"),
    cacheTtlMs: 1,
    fetchImpl: async () => {
      throw new Error("network unavailable");
    },
  });

  assert.equal(result.assets.length, 7);
  assert.ok(result.sources.every((source) => source.status === "snapshot"));
  assert.deepEqual(
    new Set(result.assets.map((asset) => asset.sourceName)),
    new Set(["CAM Realty", "Cambodia Property Asia", "Khmer24"]),
  );
  assert.ok(result.assets.every((asset) => asset.sourceUrl?.startsWith("https://")));
});

test("uses the requested city in each upstream search request", async () => {
  const requests = [];
  await discoverCambodiaAssets({
    city: "Sihanoukville",
    now: () => new Date("2026-08-02T03:02:00.000Z"),
    cacheTtlMs: 1,
    fetchImpl: async (input) => {
      const url = new URL(String(input));
      requests.push(url);
      if (url.pathname === "/robots.txt") {
        return new Response(
          url.hostname === "www.khmer24.com" ? KHMER_ROBOTS : WP_ROBOTS,
        );
      }
      throw new Error("test fallback");
    },
  });

  const sourceRequests = requests.filter((url) => url.pathname !== "/robots.txt");
  assert.ok(sourceRequests.some((url) => url.searchParams.get("search") === "Sihanoukville"));
  assert.ok(sourceRequests.some((url) => url.searchParams.get("q") === "Sihanoukville"));
});
