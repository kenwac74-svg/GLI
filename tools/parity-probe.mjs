// P0-1 비교 시나리오를 /api/search에 보내 응답 시간과 답변을 JSON으로 기록하는 측정 스크립트
import { writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const base = opt("base", "http://localhost:3000").replace(/\/$/, "");
const runs = Number(opt("runs", "3"));
const concurrency = Number(opt("concurrency", "4"));
const out = opt("out", "parity-results.json");
const only = opt("only", "");

// follows: 앞선 시나리오의 마지막 응답을 이어받는 후속 질문.
const SCENARIOS = [
  { id: "S1", q: "프놈펜에서 월 700달러 이하 1베드 임대 찾아줘" },
  { id: "S2", q: "BKK1 강 보이는 2베드 매매, 예산 2억" },
  { id: "S3", q: "은퇴하고 겨울마다 지낼 따뜻한 곳 알아보고 있어. 예산은 1억 정도야" },
  { id: "S4", q: "아이 학교 때문에 1년만 살 집이 필요해" },
  { id: "S5", q: "너무 비싸지 않은 데로 투자하고 싶어" },
  { id: "S6", q: "그중 첫 번째 후보 확인해 줘", follows: "S1" },
  { id: "S7", q: "더 싼 건 없어?", follows: "S1" },
  { id: "S8", q: "강 전망은 필요 없어, 대신 2베드로", follows: "S1" },
  { id: "S9", q: "방콕 콘도 매매 알려줘" },
  { id: "S10", q: "캄보디아 말고 베트남 호치민으로 바꿔줘", follows: "S1" },
  { id: "S11", q: "사서 월세 놓을 건데 수익률 확실한 곳 알려줘" },
  { id: "S12", q: "여기 연 10% 나온다는 게 맞아?", follows: "S11" },
  { id: "S13", q: "법적으로 외국인이 문제없이 살 수 있는 곳만 알려줘" },
  { id: "S14", q: "BKK1이랑 톤레바삭 중에 어디가 나아?" },
  { id: "S15", q: "마음에 드는 곳 상담 받고 싶어", follows: "S1" },
  { id: "S16", q: "조건 초기화하고 처음부터 다시", follows: "S1" },
].filter((s) => !only || only.split(",").includes(s.id));

async function ask(body) {
  const started = Date.now();
  try {
    const response = await fetch(`${base}/api/search`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(150_000),
    });
    const seconds = (Date.now() - started) / 1000;
    if (!response.ok) return { ok: false, status: response.status, seconds };
    return { ok: true, seconds, data: await response.json() };
  } catch (error) {
    return { ok: false, error: String(error), seconds: (Date.now() - started) / 1000 };
  }
}

function summarize(result) {
  if (!result.ok) return { ok: false, status: result.status ?? null, error: result.error ?? null, seconds: result.seconds };
  const d = result.data;
  return {
    ok: true,
    seconds: Number(result.seconds.toFixed(1)),
    mode: d.advisor?.mode ?? null,
    country: d.criteria?.country ?? null,
    city: d.criteria?.city ?? null,
    transaction: d.criteria?.transaction ?? null,
    purpose: d.criteria?.purpose ?? null,
    unsupported: d.criteria?.unsupportedLocation?.label ?? null,
    matchCount: d.matches?.length ?? 0,
    firstMatch: d.matches?.[0] ? `${d.matches[0].district} · ${d.matches[0].title}` : null,
    answer: d.answer ?? null,
    clarification: d.clarification ?? null,
  };
}

// 한 번의 실행 = 선행 시나리오(있다면)를 먼저 묻고 이어서 묻는다.
async function runOnce(scenario) {
  const chain = [];
  let prior = null;
  const steps = scenario.follows
    ? [SCENARIOS_ALL.find((s) => s.id === scenario.follows), scenario]
    : [scenario];
  for (const step of steps) {
    const body = { query: step.q };
    if (prior?.ok) {
      body.context = prior.data.criteria;
      body.previousAssetIds = (prior.data.matches ?? []).slice(0, 20).map((a) => a.id);
      body.conversation = chain.flatMap((turn) => [
        { role: "user", text: turn.query.slice(0, 1200) },
        { role: "assistant", text: (turn.answer ?? "").slice(0, 1200) },
      ]).slice(-8);
    }
    const result = await ask(body);
    chain.push({ query: step.q, answer: result.ok ? result.data.answer : "" });
    prior = result;
    if (step === scenario) return summarize(result);
    if (!result.ok) return summarize(result);
  }
}

const SCENARIOS_ALL = [...SCENARIOS];
if (only) {
  // 후속 시나리오만 고른 경우에도 선행 시나리오를 찾을 수 있게 한다.
  for (const s of SCENARIOS) {
    if (s.follows && !SCENARIOS_ALL.some((x) => x.id === s.follows)) {
      const needed = {
        S1: "프놈펜에서 월 700달러 이하 1베드 임대 찾아줘",
        S11: "사서 월세 놓을 건데 수익률 확실한 곳 알려줘",
      }[s.follows];
      SCENARIOS_ALL.push({ id: s.follows, q: needed });
    }
  }
}

const jobs = SCENARIOS.flatMap((scenario) =>
  Array.from({ length: runs }, (_, run) => ({ scenario, run })),
);
const results = [];
let cursor = 0;
await Promise.all(
  Array.from({ length: concurrency }, async () => {
    while (cursor < jobs.length) {
      const { scenario, run } = jobs[cursor++];
      const summary = await runOnce(scenario);
      results.push({ id: scenario.id, query: scenario.q, follows: scenario.follows ?? null, run: run + 1, ...summary });
      console.log(`${scenario.id} #${run + 1} ${summary.ok ? `${summary.seconds}s mode=${summary.mode} matches=${summary.matchCount}` : `FAIL ${summary.status ?? summary.error}`}`);
    }
  }),
);
results.sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }) || a.run - b.run);
writeFileSync(out, JSON.stringify({ base, runs, measuredAt: new Date().toISOString(), results }, null, 2));
console.log(`saved ${out}`);
