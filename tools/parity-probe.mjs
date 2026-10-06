// GLI 검색 API에 벤치마크 질문을 보내 응답 시간·후보·탐색 실행 여부를 기록하는 측정 스크립트
// 사용: node tools/parity-probe.mjs [--base https://glibiz.net] [--out probe.json] [--runs 3]
import { writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, all) => {
    if (cur.startsWith("--")) acc.push([cur.slice(2), all[i + 1]]);
    return acc;
  }, []),
);
const BASE = (args.base ?? "https://glibiz.net").replace(/\/$/, "");
const OUT = args.out ?? `parity-probe-${new Date().toISOString().slice(0, 10)}.json`;
const RUNS = Number(args.runs ?? 1);
const TIMEOUT_MS = 120_000;

// docs/research/P0-1_LLM_PARITY_BENCHMARK.md 의 시나리오와 같은 ID·문장을 쓴다.
export const SCENARIOS = [
  { id: "S1", label: "베트남 임대수익", query: "베트남에 월세 잘 나오는 물건, 투자금은 상관 없으니까 건물 말고 임대용 방이나 상가중에 찾아",
    followUp: "그중 첫 번째 후보, 외국인이 실제로 살 수 있는지랑 실제 월세 근거를 확인해 줘" },
  { id: "S2", label: "캄보디아 콘도 매입", query: "프놈펜에서 1억 원 안쪽으로 외국인 명의로 살 수 있는 콘도 찾아줘. 사서 월세 놓을 거야." },
  { id: "S3", label: "필리핀 RLC 연계", query: "마닐라에서 RLC Residences 쪽 분양 중인 콘도 중에 2억 원대로 살 만한 거 있어?" },
  { id: "S4", label: "태국 외국인 콘도", query: "방콕에서 외국인 쿼터가 남아 있는 콘도를 3억 원 이하로 찾아줘" },
  { id: "S5", label: "상업용 리테일", query: "호치민 1군이나 3군에서 카페 하기 좋은 1층 상가 임대 매물이랑 권리금, 월세 수준 알려줘" },
  { id: "S6", label: "거주·정성 조건", query: "아이 둘 데리고 쿠알라룸푸르로 2년 살러 가는데, 국제학교 가깝고 조용한 3베드 월세 집 찾아줘" },
  { id: "S7", label: "영문 질의", query: "Looking for a 2BR condo in Da Nang near the beach under USD 200k, mainly for rental yield." },
];

async function post(body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const t0 = performance.now();
  try {
    const res = await fetch(`${BASE}/api/search`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const tHeaders = performance.now();
    const text = await res.text();
    const tBody = performance.now();
    let json = null;
    try { json = JSON.parse(text); } catch { /* 비 JSON 응답은 원문 일부만 남긴다 */ }
    return { status: res.status, ttfbMs: Math.round(tHeaders - t0), totalMs: Math.round(tBody - t0), json, raw: json ? undefined : text.slice(0, 500) };
  } catch (error) {
    return { status: null, ttfbMs: null, totalMs: Math.round(performance.now() - t0), json: null, error: String(error) };
  } finally {
    clearTimeout(timer);
  }
}

function summarize(r) {
  const d = r.json ?? {};
  const matches = Array.isArray(d.matches) ? d.matches : [];
  return {
    status: r.status, ttfbMs: r.ttfbMs, totalMs: r.totalMs, error: r.error ?? d.error ?? null,
    criteria: d.criteria ?? null,
    matchCount: matches.length,
    matchCountries: [...new Set(matches.map((m) => m.country))],
    externalMatchCount: matches.filter((m) => m.sourceUrl).length,
    advisorMode: d.advisor?.mode ?? null,
    dataMode: d.dataMode ?? null,
    discovery: d.discovery ?? null,
    answer: d.answer ?? null,
    clarification: d.clarification ?? null,
    matchTitles: matches.slice(0, 10).map((m) => `${m.title} | ${m.city ?? ""} | ${m.priceLabel ?? m.price ?? ""}`),
  };
}

const results = [];
for (const s of SCENARIOS) {
  for (let run = 1; run <= RUNS; run += 1) {
    const first = await post({ query: s.query });
    const entry = { scenario: s.id, label: s.label, run, query: s.query, first: summarize(first) };
    if (s.followUp && first.json?.criteria) {
      const second = await post({
        query: s.followUp,
        context: first.json.criteria,
        conversation: [
          { role: "user", text: s.query },
          { role: "assistant", text: String(first.json.answer ?? "").slice(0, 1200) || "후보를 찾았습니다." },
        ],
      });
      entry.followUp = { query: s.followUp, ...summarize(second) };
    }
    results.push(entry);
    console.log(`${s.id} run${run} status=${entry.first.status} ttfb=${entry.first.ttfbMs}ms total=${entry.first.totalMs}ms matches=${entry.first.matchCount} advisor=${entry.first.advisorMode} discovery=${entry.first.discovery ? "yes" : "no"}`);
  }
}

writeFileSync(OUT, JSON.stringify({ base: BASE, measuredAt: new Date().toISOString(), runs: RUNS, results }, null, 2));
console.log(`saved ${OUT}`);
