import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { open, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function createRequest({ question = '베트남 호치민에서 1억 5천만 원으로 임대수입을 기대할 만한 아파트를 찾아줘.', history = [] } = {}) {
  return {
    model: 'openai/gpt-6.1-sol',
    messages: [
      { role: 'system', content: '한국어로 사용자의 부동산 상담에 답하세요. 현재 웹을 검색해 후보와 판단 근거를 제시하고 출처 링크를 보존하세요. 확인된 사실, 광고 주장, 추정과 미확인을 구분하고 가격·환율·임대수익을 만들지 마세요. 현재 날짜는 2026-10-30입니다.' },
      ...history,
      { role: 'user', content: question },
    ],
    tools: [{ type: 'openrouter:web_search', parameters: {
      engine: 'exa', mode: 'fast', max_uses: 1, max_results: 5,
      max_total_results: 5, max_characters: 2000,
    } }],
    max_tool_calls: 1,
    max_tokens: 2200,
    reasoning: { effort: 'low' },
    provider: { allow_fallbacks: false },
    stream: true,
    stream_options: { include_usage: true },
  };
}

export async function runProbe({ key, request = createRequest(), fetchImpl = fetch, timeoutMs = 90000, onText = () => {} }) {
  if (!key?.trim()) throw new Error('Existing OpenRouter key is required');
  key = key.trim();
  const started = performance.now();
  const elapsed = () => Math.round(performance.now() - started);
  const result = {
    started_at: new Date().toISOString(), request, timeout_ms: timeoutMs,
    status: 'started', http_status: null, generation_id: null, response_model: null,
    provider: null, headers_ms: null, first_answer_ms: null, total_ms: null,
    answer: '', annotations: [], finish_reason: null, usage: null,
    search_requests: null, search_usage_field: null, search_budget_discrepancy: null,
    events: [], error: null,
  };
  const redact = value => JSON.parse(JSON.stringify(value).replaceAll(key, '[REDACTED]'));
  let done = false;
  try {
    // One paid POST only. Do not add retries, another model or a plugin fallback.
    const response = await fetchImpl('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', redirect: 'error',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(request), signal: AbortSignal.timeout(timeoutMs),
    });
    result.headers_ms = elapsed();
    result.http_status = response.status;
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: { message: 'Non-JSON HTTP error' } }));
      result.error = { code: body.error?.code ?? response.status, message: body.error?.message ?? 'HTTP rejection' };
      result.status = 'failed';
      return redact({ ...result, total_ms: elapsed() });
    }
    if (!response.headers.get('content-type')?.includes('text/event-stream')) {
      throw new Error('Expected SSE; no second request will be attempted');
    }
    const consume = data => {
      if (!data) return;
      if (data === '[DONE]') { done = true; return; }
      const event = JSON.parse(data);
      const record = { at_ms: elapsed() };
      for (const name of ['id', 'model', 'provider', 'usage', 'error', 'type']) {
        if (event[name] !== undefined) record[name] = event[name];
      }
      result.generation_id = event.id ?? result.generation_id;
      result.response_model = event.model ?? result.response_model;
      result.provider = event.provider ?? result.provider;
      if (event.usage) {
        result.usage = { ...result.usage, ...event.usage };
        // The live beta returned *_details rather than the documented field.
        result.search_usage_field = result.usage.server_tool_use ? 'server_tool_use' :
          result.usage.server_tool_use_details ? 'server_tool_use_details' : null;
        result.search_requests = result.usage[result.search_usage_field]?.web_search_requests ?? null;
        result.search_budget_discrepancy = result.search_requests === null ? null :
          result.search_requests > request.tools[0].parameters.max_uses;
      }
      record.choices = (event.choices ?? []).map(choice => {
        const delta = choice.delta ?? choice.message ?? {};
        const text = typeof delta.content === 'string' ? delta.content : '';
        if (text) {
          result.first_answer_ms ??= elapsed();
          result.answer += text;
          onText(text);
        }
        const annotations = delta.annotations ?? choice.annotations ?? [];
        result.annotations.push(...annotations);
        result.finish_reason = choice.finish_reason ?? result.finish_reason;
        return { content: text, annotations, tool_calls: delta.tool_calls, finish_reason: choice.finish_reason };
      });
      if (event.annotations) result.annotations.push(...event.annotations);
      result.events.push(record);
      if (event.error) throw new Error(event.error.message ?? 'SSE error');
    };
    // readline handles split UTF-8 and CRLF; SSE fields are framed before JSON parsing.
    const lines = createInterface({ input: Readable.fromWeb(response.body), crlfDelay: Infinity });
    let data = [];
    for await (const line of lines) {
      if (line === '') { consume(data.join('\n')); data = []; }
      else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
    }
    if (data.length) consume(data.join('\n'));
    if (!done || !result.finish_reason || !result.answer) throw new Error('Incomplete SSE answer or missing final completion marker');
    result.status = 'completed';
  } catch (error) {
    result.status = 'failed';
    result.error ??= { name: error.name, code: error.cause?.code ?? null, message: error.message };
  }
  result.total_ms = elapsed();
  result.annotations = [...new Map(result.annotations.map(item => [JSON.stringify(item), item])).values()];
  return redact(result);
}

async function main() {
  if (!process.argv.includes('--live')) {
    console.log(JSON.stringify({ mode: 'dry-run; no network request', request: createRequest() }, null, 2));
    return;
  }
  process.loadEnvFile(resolve('.env.local'));
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) throw new Error('Existing OpenRouter key missing; no request sent');
  const output = resolve('docs/research/p010-direct-search-20261030.json');
  await mkdir(dirname(output), { recursive: true });
  // Exclusive evidence file is also a rerun guard, including after a process crash.
  const file = await open(output, 'wx');
  try {
    await file.writeFile(JSON.stringify({ status: 'reserved; inspect before any rerun', reserved_at: new Date().toISOString() }));
    const result = await runProbe({ key, onText: text => process.stdout.write(text.replaceAll(key, '[REDACTED]')) });
    result.generation_metadata = null;
    if (result.generation_id) {
      try {
        const response = await fetch(`https://openrouter.ai/api/v1/generation?id=${encodeURIComponent(result.generation_id)}`, {
          headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15000),
        });
        const body = await response.json();
        result.metadata_http_status = response.status;
        // GET only; no paid retry if accounting is delayed or unavailable.
        const source = body.data ?? {};
        result.generation_metadata = Object.fromEntries([
          'id', 'model', 'provider_name', 'total_cost', 'usage', 'is_byok',
          'tokens_prompt', 'tokens_completion', 'native_tokens_prompt', 'native_tokens_completion',
          'native_tokens_reasoning', 'num_search_results', 'latency', 'generation_time', 'finish_reason',
        ].filter(name => source[name] !== undefined).map(name => [name, source[name]]));
        if (!response.ok) result.metadata_error = body.error?.message ?? 'Metadata unavailable';
      } catch (error) { result.metadata_error = error.message; }
    }
    await file.truncate(0);
    await file.write(JSON.stringify(result, null, 2).replaceAll(key, '[REDACTED]'), 0, 'utf8');
    console.log('\n' + JSON.stringify({ output, status: result.status, first_answer_ms: result.first_answer_ms, total_ms: result.total_ms, search_requests: result.search_requests, usage: result.usage, error: result.error }));
    if (result.status !== 'completed') process.exitCode = 1;
  } finally { await file.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
