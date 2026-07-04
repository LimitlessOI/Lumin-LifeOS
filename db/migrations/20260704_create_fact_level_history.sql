-- SYNOPSIS: Database migration — 20260704_create_fact_level_history.sql.
-- MI-P1-003: fact_level_history tracks changes in fact levels
CREATE TABLE IF NOT EXISTS fact_level_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fact_id UUID NOT NULL,
  from_level INT NOT NULL,
  to_level INT NOT NULL,
  reason TEXT,
  evidence_id UUID,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fact_level_history_fact_id ON fact_level_history (fact_id);
CREATE INDEX IF NOT EXISTS idx_fact_level_history_changed_at ON fact_level_history (changed_at);