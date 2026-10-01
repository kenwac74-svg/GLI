-- GS-004 / P50: discovery is durable, not staff verification or publication approval.
CREATE TABLE discovered_assets (
  public_id TEXT PRIMARY KEY NOT NULL,
  source_url TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('sale', 'rent')),
  country TEXT NOT NULL,
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  first_seen_at INTEGER NOT NULL,
  observed_at INTEGER NOT NULL,
  UNIQUE (source_url, transaction_type)
);
CREATE INDEX discovered_assets_country_observed_idx ON discovered_assets(country, observed_at);
