import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequest } from '../scripts/p010-direct-search.mjs';
import { QUESTIONS, requestForCase } from '../scripts/p010-five-cases.mjs';

test('four fresh cases retain all P010 controls and the exact user questions', () => {
  assert.equal(QUESTIONS.length, 5);
  for (let i = 1; i <= 4; i++) {
    const request = requestForCase(i);
    assert.deepEqual(request, createRequest({ question: QUESTIONS[i - 1] }));
    assert.equal(request.messages.length, 2);
  }
  assert.equal(QUESTIONS[0], createRequest().messages[1].content);
});

test('follow-up needs a completed case2 and operator-confirmed actual second candidate', () => {
  assert.throws(() => requestForCase(5), /case2/i);
  const case2 = { status: 'completed', request: requestForCase(2), answer: '1. First\n2. Second apartment', annotations: [{ type: 'url_citation', url_citation: { url: 'https://example.com/2' } }] };
  assert.throws(() => requestForCase(5, case2), /candidate/i);
  assert.throws(() => requestForCase(5, case2, 'invented'), /candidate/i);
  const request = requestForCase(5, case2, 'Second apartment');
  assert.deepEqual(request.messages.slice(1), [case2.request.messages[1], { role: 'assistant', content: case2.answer, annotations: case2.annotations }, { role: 'user', content: QUESTIONS[4] }]);
  assert.equal(request.model, requestForCase(2).model);
  assert.deepEqual(request.tools, requestForCase(2).tools);
});
