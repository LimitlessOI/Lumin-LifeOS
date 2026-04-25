-- Amendment 36 — Builder conductor audit + Kingsman audit trail
-- Applied automatically on Railway boot with other migrations.

CREATE TABLE IF NOT EXISTS conductor_builder_audit (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  domain TEXT,
  task_preview TEXT,
  model_used TEXT,
  output_chars INTEGER,
  cache_hit BOOLEAN NOT NULL DEFAULT FALSE,
  placement_json JSONB
);

CREATE INDEX IF NOT EXISTS idx_conductor_builder_audit_created
  ON conductor_builder_audit (created_at DESC);

CREATE TABLE IF NOT EXISTS kingsman_audit_log (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  member TEXT,
  task_type TEXT,
  prompt_hash TEXT,
  risk_score INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_kingsman_audit_created
  ON kingsman_audit_log (created_at DESC);
