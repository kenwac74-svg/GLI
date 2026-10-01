import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { runAdvisorSearch } from "../lib/ai-search.ts";
import { searchAssets } from "../lib/search.ts";

// Internal GLI-052 evaluation only. Synthetic facts never enter public inventory.
const fixtureDate = "2026-09-18T00:00:00.000Z";
const common = {
  country: "Cambodia", countryCode: "KH", city: "Phnom Penh",
  transaction: "rent", propertyType: "condo", bedrooms: 2, bathrooms: 2,
  currency: "USD", image: "", trustStatus: "REVIEWING", isGliDirect: false,
  updatedAt: fixtureDate, checks: ["Actual availability", "Management fee"],
};
const fixtures = [
  { ...common, id: "EVAL-A", title: "Evaluation residence A", district: "BKK1",
    price: 650, areaSqm: 70, trustScore: 70,
    summary: "Synthetic evaluation listing. Furnished; management fee not supplied.",
    strengths: ["Furnished", "Central location"] },
  { ...common, id: "EVAL-B", title: "Evaluation residence B", district: "Tonle Bassac",
    price: 700, areaSqm: 82, trustScore: 70,
    summary: "Synthetic evaluation listing. Furnished; management fee not supplied.",
    strengths: ["Furnished", "Larger floor area"] },
];

export function comparisonScenarios() {
  return [
    {
      id: "local-rental",
      query: "프놈펜에서 월 700달러 이하로 가구가 있는 2베드룸을 찾고 있어. 두 후보 중 무엇부터 확인할까?",
      assets: fixtures, conversation: [],
      review: "Compare supplied price and area; ask about missing management fees without inventing them.",
    },
    {
      id: "income-follow-up",
      query: "총예산을 6,000만원으로 올릴게. 취득 부대비용도 포함이고, 즉시 월세가 나오는 완공 물건만 봐줘.",
      assets: [],
      conversation: [
        { role: "user", text: "프놈펜에 5,000만원 정도 투자해서 월세 수입을 얻고 싶어." },
        { role: "assistant", text: "현재 제공된 자료로는 후보가 확인되지 않습니다. 완공 물건을 원하시나요?" },
      ],
      review: "Remember Phnom Penh and investment intent; do not re-ask completion preference or invent prices/taxes.",
    },
    {
      id: "strict-location",
      query: "시하누크빌에서 월 700달러 이하 2베드룸만 찾아줘. 다른 도시는 보지 않을게.",
      assets: fixtures, conversation: [],
      review: "No local candidates: do not substitute Phnom Penh or claim the whole city has no inventory.",
    },
  ].map((scenario) => {
    const context = scenario.id === "income-follow-up"
      ? searchAssets(scenario.conversation[0].text, []).criteria : null;
    const preparedSearch = searchAssets(scenario.query, scenario.assets, context);
    preparedSearch.rate.asOf = fixtureDate;
    return { ...scenario, context, preparedSearch };
  });
}

export function comparisonInputHash(body) {
  const { model: _model, ...shared } = body;
  void _model;
  return createHash("sha256").update(JSON.stringify(shared)).digest("hex");
}

async function main() {
  const args = process.argv.slice(2);
  const live = args.includes("--run");
  const modelArg = args.find((arg) => arg.startsWith("--models="));
  const models = [...new Set((modelArg?.slice(9) ?? "").split(",").filter(Boolean))];
  if (!models.length || models.length > 5 || models.some((id) => !/^[a-z0-9-]+\/[a-z0-9._:-]+$/.test(id) || /latest|:free|auto/.test(id))) {
    throw new Error("Specify 1-5 explicit versioned model IDs with --models=vendor/model,... (no latest/free/auto aliases).");
  }
  const scenarios = comparisonScenarios();
  const calls = models.length * scenarios.length;
  if (!live) {
    console.log(JSON.stringify({ mode: "dry-run", models, calls, scenarios: scenarios.map(({ id, review }) => ({ id, review })) }, null, 2));
    return;
  }

  process.loadEnvFile(resolve(".env.local"));
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key?.startsWith("sk-or-")) throw new Error("A valid OPENROUTER_API_KEY is required in the local server environment.");
  const catalogResponse = await fetch("https://openrouter.ai/api/v1/models", { signal: AbortSignal.timeout(30_000) });
  if (!catalogResponse.ok) throw new Error(`Catalog unavailable: HTTP ${catalogResponse.status}`);
  const catalog = (await catalogResponse.json()).data;
  for (const model of models) {
    const entry = catalog.find((item) => item.id === model);
    if (!entry || !["structured_outputs", "reasoning"].every((p) => entry.supported_parameters?.includes(p))) {
      throw new Error(`Model unavailable or required parameters unsupported: ${model}`);
    }
  }

  const directory = resolve("work/advisor-comparisons");
  await mkdir(directory, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(":", "-");
  const reportPath = resolve(directory, `${stamp}.json`);
  const report = {
    createdAt: new Date().toISOString(), fixtureDate,
    scope: "Synthetic advisor-only comparison, not crawler/UI testing or market evidence.",
    models, maxCalls: calls, rows: [],
  };
  const hashes = new Map();
  evaluation: for (const scenario of scenarios) {
    for (const model of models) {
      let inputHash;
      const start = performance.now();
      const result = await runAdvisorSearch(scenario.query, scenario.assets, {
        provider: "openrouter", apiKey: key, model,
        conversation: scenario.conversation, preparedSearch: structuredClone(scenario.preparedSearch),
        fetch: async (url, init) => {
          inputHash = comparisonInputHash(JSON.parse(init.body));
          const previous = hashes.get(scenario.id);
          if (previous && previous !== inputHash) throw new Error("Comparison input changed.");
          hashes.set(scenario.id, inputHash);
          return fetch(url, init);
        },
      });
      const row = {
        scenario: scenario.id, model, inputHash,
        durationMs: Math.round(performance.now() - start),
        question: scenario.query, review: scenario.review,
        actualAi: result.advisor.mode === "openrouter", diagnostic: result.advisor,
        answer: result.advisor.mode === "openrouter" ? result.answer : null,
        clarification: result.advisor.mode === "openrouter" ? result.clarification : null,
        selectedIds: result.matches.map((asset) => asset.id),
        baselineCriteria: scenario.preparedSearch.criteria,
      };
      report.rows.push(row);
      // Never write keys, auth headers, raw upstream errors or reasoning traces.
      await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
      console.log(JSON.stringify({ scenario: row.scenario, model, actualAi: row.actualAi, failure: row.diagnostic.failure, usage: row.diagnostic.usage }));
      if ([401, 402].includes(result.advisor.failure?.status)) break evaluation;
    }
  }
  console.log(`Report: ${reportPath}`);
  if (report.rows.some((row) => !row.actualAi)) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : "Comparison failed";
    console.error(message.replace(/sk-[A-Za-z0-9_-]+/g, "[REDACTED]"));
    process.exitCode = 1;
  });
}
