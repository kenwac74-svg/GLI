import { mkdir, open, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import { createRequest, runProbe } from './p010-direct-search.mjs';

export const QUESTIONS = [
  '베트남 호치민에서 1억 5천만 원으로 임대수입을 기대할 만한 아파트를 찾아줘.',
  '방콕에서 혼자 1년 정도 살 아파트를 찾아줘. 월세는 100만원 이하이고, BTS역까지 걸어서 10분 이내, 가구가 있는 곳이면 좋겠어.',
  '은퇴 후 겨울마다 석 달씩 동남아에서 살아보고 싶어. 병원 이용이 편하고 너무 번잡하지 않은 곳이면 좋겠는데, 어디부터 알아보면 좋을까? 나라와 예산은 아직 안 정했어.',
  '아파트 광고에 연 임대수익률 6%라고 쓰여 있으면, 1억원짜리 집을 사서 매달 50만원을 받는다는 뜻이야? 실제로 내게 남는 돈과 어떻게 다른지 쉽게 설명해줘.',
  '방금 보여준 두 번째 아파트는 관리비가 월세에 포함돼?',
];

export function requestForCase(number, case2, secondCandidate) {
  if (!Number.isInteger(number) || number < 1 || number > 5) throw new Error('Case must be 1-5');
  if (number < 5) return createRequest({ question: QUESTIONS[number - 1] });
  if (case2?.status !== 'completed' || case2?.request?.messages?.[1]?.content !== QUESTIONS[1]) {
    throw new Error('Completed case2 is required; do not invent a predecessor');
  }
  if (!secondCandidate?.trim() || !case2.answer.includes(secondCandidate)) {
    throw new Error('Operator must identify an actual second candidate in case2');
  }
  return createRequest({ question: QUESTIONS[4], history: [
    case2.request.messages[1],
    { role: 'assistant', content: case2.answer, annotations: case2.annotations ?? [] },
  ] });
}

async function main() {
  const { values } = parseArgs({ options: { case: { type: 'string' }, live: { type: 'boolean' }, 'second-candidate': { type: 'string' } } });
  const number = Number(values.case ?? 1);
  const folder = resolve('docs/research/p010-five-cases-20261030');
  const case2 = number === 5 ? JSON.parse(await readFile(resolve(folder, 'api-case-2.json'), 'utf8')) : undefined;
  const request = requestForCase(number, case2, values['second-candidate']);
  if (!values.live) { console.log(JSON.stringify({ mode: 'dry-run; no network', number, request }, null, 2)); return; }
  process.loadEnvFile(resolve('.env.local'));
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) throw new Error('Existing OpenRouter key required; no request sent');
  await mkdir(folder, { recursive: true });
  const output = resolve(folder, `api-case-${number}.json`);
  const file = await open(output, 'wx');
  try {
    await file.writeFile(JSON.stringify({ status: 'reserved; inspect before any repeat', reserved_at: new Date().toISOString(), case: number }));
    console.log(JSON.stringify({ case: number, status: 'starting', model: request.model }));
    const result = await runProbe({ key, request });
    result.case = number;
    result.conversation = number === 5 ? 'case2' : `case${number}`;
    if (number === 5) result.confirmed_second_candidate = values['second-candidate'];
    const { messages, ...settings } = request;
    result.settings_sha256 = createHash('sha256').update(JSON.stringify({ ...settings, system: messages[0] })).digest('hex');
    // Preserve answer/citations/usage; avoid thousands of duplicated token-event lines.
    result.event_summary = { count: result.events.length, first: result.events[0], last: result.events.at(-1), tool_events: result.events.filter(event => event.type || event.choices?.some(choice => choice.tool_calls)) };
    delete result.events;
    await file.truncate(0);
    await file.write(JSON.stringify(result, null, 2), 0, 'utf8');
    await writeFile(resolve(folder, `api-case-${number}-answer.md`), `# P-010 API case ${number}\n\nQuestion: ${QUESTIONS[number - 1]}\n\n${result.answer || '[No answer received]'}\n`);
    console.log(JSON.stringify({ case: number, status: result.status, first_answer_ms: result.first_answer_ms, total_ms: result.total_ms, model: result.response_model, search_requests: result.search_requests, usage: result.usage, error: result.error }));
    if (result.status !== 'completed') process.exitCode = 1;
  } finally { await file.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
