-- SYNOPSIS: Database migration — 20260529_command_center_communications.sql.
-- Command Center communication history (NOT BuilderOS epistemic proof memory)
-- @ssot docs/products/command-center/PRODUCT_HOME.md

CREATE TABLE IF NOT EXISTS command_center_communications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  speaker         TEXT NOT NULL DEFAULT 'adam',
  council_member  TEXT,
  mode            TEXT NOT NULL DEFAULT 'quick_ask',
  domain          TEXT,
  transcript      TEXT NOT NULL,
  response_text   TEXT,
  evidence_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
  builder_job_id  TEXT,
  commit_sha      TEXT,
  railway_sha     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cc_comm_created_at ON command_center_communications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cc_comm_mode ON command_center_communications(mode);
