-- @ssot docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md
-- ClientCare billing ops assistant + capability queue

CREATE TABLE IF NOT EXISTS clientcare_capability_requests (
  id BIGSERIAL PRIMARY KEY,
  request_text TEXT NOT NULL,
  normalized_intent TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  priority TEXT NOT NULL DEFAULT 'normal',
  requested_by TEXT,
  implementation_notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientcare_capability_requests_status
  ON clientcare_capability_requests(status);
