-- GS-020: receipt-only member inquiries; no assignment, booking or delivery.
CREATE TABLE member_inquiries (
  receipt_number TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  submission_key TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  member_name TEXT,
  member_email TEXT NOT NULL,
  asset_public_id TEXT REFERENCES asset_references(public_id),
  request_text TEXT NOT NULL,
  contact TEXT,
  status TEXT NOT NULL DEFAULT 'RECEIVED' CHECK(status='RECEIVED'),
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX member_inquiries_submission_uidx ON member_inquiries(user_id, submission_key);
--> statement-breakpoint
CREATE INDEX member_inquiries_user_created_idx ON member_inquiries(user_id, created_at);
