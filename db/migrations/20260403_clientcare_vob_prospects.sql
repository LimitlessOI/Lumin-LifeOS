-- @ssot docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md
-- Saved prospect VOB history, insurance-card extraction history, and promotion queue.

CREATE TABLE IF NOT EXISTS clientcare_vob_prospects (
  id BIGSERIAL PRIMARY KEY,
  source_type TEXT NOT NULL DEFAULT 'prospect',
  status TEXT NOT NULL DEFAULT 'prospect_saved',
  full_name TEXT,
  phone TEXT,
  email TEXT,
  payer_name TEXT,
  member_id TEXT,
  group_number TEXT,
  subscriber_name TEXT,
  support_phone TEXT,
  preview_result JSONB NOT NULL DEFAULT '{}'::jsonb,
  extracted_text TEXT,
  matched_client_name TEXT,
  matched_client_member_id TEXT,
  file_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  requested_by TEXT,
  promoted_request_id BIGINT REFERENCES clientcare_capability_requests(id) ON DELETE SET NULL,
  promoted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientcare_vob_prospects_created_at
  ON clientcare_vob_prospects(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_clientcare_vob_prospects_status
  ON clientcare_vob_prospects(status);

CREATE INDEX IF NOT EXISTS idx_clientcare_vob_prospects_full_name
  ON clientcare_vob_prospects(full_name);
