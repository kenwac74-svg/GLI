-- P38 / GS-012: operating attempts are never refunded with customer allowances.
CREATE TABLE ai_operation_requests (
  id TEXT PRIMARY KEY NOT NULL,
  day_key TEXT NOT NULL,
  actor_key TEXT NOT NULL,
  started_at INTEGER NOT NULL
);
CREATE INDEX ai_operations_day_actor_idx ON ai_operation_requests(day_key, actor_key);

CREATE TABLE ai_provider_calls (
  id TEXT PRIMARY KEY NOT NULL,
  operation_id TEXT NOT NULL REFERENCES ai_operation_requests(id),
  stage TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL,
  http_status INTEGER,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  cost_usd REAL,
  started_at INTEGER NOT NULL,
  finished_at INTEGER
);
CREATE INDEX ai_calls_operation_idx ON ai_provider_calls(operation_id);
