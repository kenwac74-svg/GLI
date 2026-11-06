import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual, parseArgs } from 'node:util';
import { createRequest } from './p010-direct-search.mjs';
import { QUESTIONS } from './p010-five-cases.mjs';

const trialDate = '2026-11-06';
const system = readFileSync(new URL('../docs/research/p011-progressive-search-20261106/system.txt', import.meta.url), 'utf8').replaceAll('\r\n', '\n').trimEnd();
const questions = { 1: QUESTIONS[0], 3: QUESTIONS[3], 4: '시진핑은 뭐하는 사람이야?' };
const blocker = 'OpenRouter search cap enforcement is not verified for the unchanged P-010 request';

export function createTrialRequest({ trial, date = trialDate, t1, selection }) {
  if (date !== trialDate) throw new Error('This preflight is fixed to the recorded trial date');
  if (![1, 2, 3, 4].includes(trial)) throw new Error('Expected trial 1-4');
  let question = questions[trial];
  let history = [];
  if (trial === 2) {
    if (t1?.status !== 'completed' || !isDeepStrictEqual(t1.request, createTrialRequest({ trial: 1, date }))) {
      throw new Error('T2 requires completed T1 from this trial');
    }
    const heading = /^\s*(?:#{1,6}\s+)?(?:\*\*)?이어서 알아보기(?:\*\*)?:?\s*$/m.exec(t1.answer);
    const suggestions = heading ? t1.answer.slice(heading.index + heading[0].length).split(/\r?\n/)
      .filter(Boolean).map(line => /^\s*(?:[-*]|\d+[.)])\s+(.+?)\s*$/.exec(line)?.[1]) : [];
    if (!selection || !suggestions.includes(selection)) throw new Error('Select a literal T1 suggestion after human review');
    question = selection;
    history = [t1.request.messages[1], { role: 'assistant', content: t1.answer, annotations: t1.annotations ?? [] }];
  }
  const request = createRequest({ question, history });
  request.messages[0] = { role: 'system', content: system };
  return request;
}

export function main(args = process.argv.slice(2)) {
  const { values } = parseArgs({ args, options: { date: { type: 'string' }, live: { type: 'boolean' } } });
  // No network path until the provider-side control is verified in a separate review.
  if (values.live) {
    console.error('BLOCKED: ' + blocker);
    process.exitCode = 1;
    return;
  }
  const requests = [1, 3, 4].map(trial => ({ trial, request: createTrialRequest({ trial, date: values.date }) }));
  console.log(JSON.stringify({ mode: 'offline dry-run', status: 'BLOCKED', blocker, paidRequests: 0,
    t2: 'Not attempted; requires a real completed T1 and an eligible literal suggestion', requests }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
