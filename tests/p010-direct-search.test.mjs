import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequest, runProbe } from '../scripts/p010-direct-search.mjs';

test('P010 is a single bounded model/search request, not the application pipeline', () => {
  const request = createRequest();
  assert.equal(request.model, 'openai/gpt-6.1-sol');
  assert.equal(request.max_tool_calls, 1);
  assert.equal(request.max_tokens, 2200);
  assert.equal(request.tools.length, 1);
  assert.equal(request.tools[0].type, 'openrouter:web_search');
  assert.equal(request.tools[0].parameters.max_uses, 1);
  assert.equal(request.tools[0].parameters.engine, 'exa');
  assert.equal(request.provider.allow_fallbacks, false);
  assert.equal(request.plugins, undefined);
  assert.equal(request.models, undefined);
  assert.equal(request.messages[1].content, '베트남 호치민에서 1억 5천만 원으로 임대수입을 기대할 만한 아파트를 찾아줘.');
});

test('alternate questions and follow-up history cannot change the P010 model/search settings', async () => {
  const original = createRequest();
  const history = [{ role: 'user', content: 'Bangkok question' }, { role: 'assistant', content: '1. First apartment\n2. Second apartment', annotations: [] }];
  const request = createRequest({ question: 'Follow-up question', history });
  const withoutMessages = request => { const settings = { ...request }; delete settings.messages; return settings; };
  assert.deepEqual(withoutMessages(request), withoutMessages(original));
  assert.deepEqual(request.messages, [original.messages[0], ...history, { role: 'user', content: 'Follow-up question' }]);
  assert.equal(createRequest({ question: 'fresh' }).messages.length, 2);
  let sent;
  await runProbe({ key: 'test-key', request, fetchImpl: async (_url, options) => {
    sent = JSON.parse(options.body);
    return new Response('{"error":{"message":"offline"}}', { status: 403 });
  } });
  assert.deepEqual(sent, request);
});

test('SSE comments, split UTF-8, citations and final usage are preserved without reasoning', async () => {
  let calls = 0;
  const citation = { type: 'url_citation', url_citation: { url: 'https://example.com/a', title: 'Listing' } };
  const stream = ': PROCESSING\r\n\r\n' +
    'data: ' + JSON.stringify({ id: 'gen-test', model: 'actual-model', provider: 'OpenAI', choices: [{ delta: { content: '호치민', reasoning: 'private', annotations: [citation] } }] }) + '\r\n\r\n' +
    'data: ' + JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 5, cost: 0.001, server_tool_use: { web_search_requests: 1 } } }) + '\n\n' +
    'data: [DONE]\n\n';
  const bytes = new TextEncoder().encode(stream);
  const result = await runProbe({ key: 'test-key', fetchImpl: async () => {
    calls++;
    return new Response(new ReadableStream({ start(controller) {
      for (let i = 0; i < bytes.length; i += 7) controller.enqueue(bytes.slice(i, i + 7));
      controller.close();
    } }), { headers: { 'content-type': 'text/event-stream' } });
  } });
  assert.equal(calls, 1);
  assert.equal(result.status, 'completed');
  assert.equal(result.answer, '호치민');
  assert.equal(result.response_model, 'actual-model');
  assert.equal(result.search_requests, 1);
  assert.deepEqual(result.annotations, [citation]);
  assert.ok(result.first_answer_ms >= 0);
  assert.ok(result.total_ms >= result.first_answer_ms);
  assert.equal(JSON.stringify(result).includes('private'), false);
  assert.equal(JSON.stringify(result).includes('test-key'), false);
});

test('HTTP rejection is recorded once with no provider/plugin fallback and key redacted', async () => {
  let calls = 0;
  const result = await runProbe({ key: 'test-key', fetchImpl: async () => {
    calls++;
    return new Response(JSON.stringify({ error: { code: 403, message: 'blocked test-key' } }), { status: 403 });
  } });
  assert.equal(calls, 1);
  assert.equal(result.status, 'failed');
  assert.equal(result.http_status, 403);
  assert.equal(result.search_requests, null);
  assert.equal(result.first_answer_ms, null);
  assert.equal(JSON.stringify(result).includes('test-key'), false);
});

test('observed server_tool_use_details variant flags a requested-budget discrepancy', async () => {
  const data = 'data: ' + JSON.stringify({ choices: [{ delta: { content: 'answer' }, finish_reason: 'stop' }], usage: { server_tool_use_details: { web_search_requests: 5 } } }) + '\n\ndata: [DONE]\n\n';
  const result = await runProbe({ key: 'test-key', fetchImpl: async () => new Response(data, { headers: { 'content-type': 'text/event-stream' } }) });
  assert.equal(result.search_requests, 5);
  assert.equal(result.search_usage_field, 'server_tool_use_details');
  assert.equal(result.search_budget_discrepancy, true);
});

test('stream errors and premature EOF do not masquerade as completed answers', async () => {
  for (const data of ['data: {"error":{"message":"failed"}}\n\n', 'data: {"choices":[{"delta":{"content":"partial"}}]}\n\n']) {
    const result = await runProbe({ key: 'test-key', fetchImpl: async () => new Response(data, { headers: { 'content-type': 'text/event-stream' } }) });
    assert.equal(result.status, 'failed');
  }
});

test('timeout has no retry; missing key never reaches the network', async () => {
  let calls = 0;
  const result = await runProbe({ key: 'test-key', timeoutMs: 5, fetchImpl: async (_url, { signal }) => {
    calls++;
    await new Promise((_resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('test timer failed')), 100);
      signal.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
    });
  } });
  assert.equal(calls, 1);
  assert.equal(result.status, 'failed');
  assert.match(result.error.message, /timeout/i);
  await assert.rejects(runProbe({ key: '', fetchImpl: () => { throw Error('must not fetch'); } }), /key/i);
});
