-- Additive retention: existing discovery/listings/favorites are preserved.
CREATE TABLE asset_references (
  public_id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('listing','discovery','fixture')),
  payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
  content_hash TEXT NOT NULL,
  first_seen_at INTEGER NOT NULL,
  checked_at INTEGER NOT NULL,
  source_state TEXT NOT NULL DEFAULT 'present' CHECK(source_state IN ('present','removed','check_failed')),
  transaction_state TEXT NOT NULL DEFAULT 'unknown' CHECK(transaction_state IN ('unknown','available','completed')),
  identity_group TEXT,
  identity_evidence_json TEXT CHECK(identity_evidence_json IS NULL OR json_valid(identity_evidence_json))
);
CREATE INDEX asset_references_group_idx ON asset_references(identity_group);
CREATE TABLE asset_versions (
  id TEXT PRIMARY KEY NOT NULL,
  asset_public_id TEXT NOT NULL REFERENCES asset_references(public_id),
  content_hash TEXT NOT NULL,
  observed_at INTEGER NOT NULL,
  payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
  changed_fields_json TEXT NOT NULL CHECK(json_valid(changed_fields_json)),
  source_state TEXT NOT NULL,
  transaction_state TEXT NOT NULL
);
CREATE INDEX asset_versions_asset_time_idx ON asset_versions(asset_public_id, observed_at, id);
CREATE TABLE asset_favorite_refs (
  user_id TEXT NOT NULL REFERENCES users(id),
  asset_public_id TEXT NOT NULL REFERENCES asset_references(public_id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, asset_public_id)
);
-- Triggers make latest + version atomic even under concurrent repository callers.
CREATE TRIGGER asset_reference_initial_version AFTER INSERT ON asset_references BEGIN
  INSERT INTO asset_versions VALUES (
    lower(hex(randomblob(16))), NEW.public_id, NEW.content_hash, NEW.checked_at,
    NEW.payload_json, '["baseline"]', NEW.source_state, NEW.transaction_state
  );
END;
CREATE TRIGGER asset_reference_changed_version AFTER UPDATE ON asset_references
WHEN OLD.content_hash != NEW.content_hash OR OLD.source_state != NEW.source_state OR OLD.transaction_state != NEW.transaction_state
BEGIN
  INSERT INTO asset_versions VALUES (
    lower(hex(randomblob(16))), NEW.public_id, NEW.content_hash, NEW.checked_at,
    NEW.payload_json,
    (SELECT json_group_array(key) FROM (
      SELECT key FROM json_each(NEW.payload_json)
      WHERE json_extract(OLD.payload_json, '$.' || key) IS NOT json_extract(NEW.payload_json, '$.' || key)
      UNION ALL SELECT 'sourceState' WHERE OLD.source_state != NEW.source_state
      UNION ALL SELECT 'transactionState' WHERE OLD.transaction_state != NEW.transaction_state)),
    NEW.source_state, NEW.transaction_state
  );
END;
