-- SYNOPSIS: Database migration — 20260704_create_fact_evidence.sql.
-- MI-P1-002: fact_evidence table for Memory Intelligence
CREATE TABLE IF NOT EXISTS fact_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fact_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  result TEXT NOT NULL,
  evidence_text TEXT,
  source TEXT,
  source_is_independent BOOLEAN,
  adversarial_quality INT,
  override_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fact_evidence_fact_id ON fact_evidence (fact_id);
CREATE INDEX IF NOT EXISTS idx_fact_evidence_event_type ON fact_evidence (event_type);
CREATE INDEX IF NOT EXISTS idx_fact_evidence_created_at ON fact_evidence (created_at);