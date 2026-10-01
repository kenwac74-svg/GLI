-- GS-021 / P51: administrator input is not publication or verification.
CREATE TABLE manual_asset_drafts (
  id TEXT PRIMARY KEY NOT NULL,
  actor_user_id TEXT NOT NULL REFERENCES users(id),
  input_hash TEXT NOT NULL,
  payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
  status TEXT NOT NULL DEFAULT 'REVIEW_PENDING' CHECK(status = 'REVIEW_PENDING'),
  created_at INTEGER NOT NULL
);
CREATE INDEX manual_asset_drafts_created_idx ON manual_asset_drafts(created_at);
