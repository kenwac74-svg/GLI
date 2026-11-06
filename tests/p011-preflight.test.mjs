import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createTrialRequest } from '../scripts/p011-preflight.mjs';

const date = '2026-11-06';
const baseline = JSON.parse(readFileSync(new URL('../docs/research/p010-five-cases-20261030/api-case-1.json', import.meta.url)));
const settings = request => Object.fromEntries(Object.entries(request).filter(([key]) => key !== 'messages'));

test('T1, T3 and T4 start fresh with original P-010 settings and the same dated P-011 system', () => {
  const requests = [1, 3, 4].map(trial => createTrialRequest({ trial, date }));
  for (const request of requests) {
    assert.deepEqual(settings(request), settings(baseline.request));
    assert.deepEqual(request.messages.map(message => message.role), ['system', 'user']);
    assert.deepEqual(request.messages[0], requests[0].messages[0]);
    assert.match(request.messages[0].content, /2026-11-06/);
    assert.doesNotMatch(request.messages[0].content, /CURRENT_DATE/);
  }
  assert.equal(requests[0].messages[1].content, baseline.request.messages[1].content);
  assert.equal(requests[2].messages[1].content, '시진핑은 뭐하는 사람이야?');
});

test('T2 requires completed matching T1 and preserves the reviewed literal, full reply and sources', () => {
  assert.throws(() => createTrialRequest({ trial: 2, date }), /completed T1/);
  const selection = '첫 번째 후보의 임대광고를 더 찾아줘.';
  const t1 = { status: 'completed', request: createTrialRequest({ trial: 1, date }),
    answer: '시험용 모의 답변\n\n### 이어서 알아보기\n1. ' + selection, annotations: [{ type: 'url_citation', url: 'https://example.com' }] };
  assert.throws(() => createTrialRequest({ trial: 2, date, t1, selection: '임의 질문' }), /literal/);
  const request = createTrialRequest({ trial: 2, date, t1, selection });
  assert.deepEqual(settings(request), settings(baseline.request));
  assert.deepEqual(request.messages, [...t1.request.messages,
    { role: 'assistant', content: t1.answer, annotations: t1.annotations },
    { role: 'user', content: selection }]);
});

test('CLI is offline by default and refuses repeated live attempts without exposing keys', () => {
  const script = new URL('../scripts/p011-preflight.mjs', import.meta.url);
  const env = { ...process.env, OPENROUTER_API_KEY: 'p011-synthetic-secret' };
  const run = (...args) => spawnSync(process.execPath, ['--input-type=module', '-e',
    `globalThis.fetch=()=>{throw Error('unexpected network')};await import(${JSON.stringify(script.href)}).then(m=>m.main(process.argv.slice(1)))`, '--', ...args], { env, encoding: 'utf8' });
  const dry = run('--date', date);
  assert.equal(dry.status, 0, dry.stderr);
  assert.equal(JSON.parse(dry.stdout).status, 'BLOCKED');
  for (let i = 0; i < 2; i++) {
    const live = run('--live');
    assert.equal(live.status, 1);
    assert.match(live.stderr, /BLOCKED/);
    assert.doesNotMatch(live.stdout + live.stderr, /p011-synthetic-secret|unexpected network/);
  }
});
