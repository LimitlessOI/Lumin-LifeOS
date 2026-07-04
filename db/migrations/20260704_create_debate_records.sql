-- SYNOPSIS: Database migration — 20260704_create_debate_records.sql.
-- Memory Intelligence: debate_records
-- Blueprint: MI-P1-005

CREATE TABLE IF NOT EXISTS debate_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  related_fact_id UUID,
  initial_positions JSONB,
  arguments JSONB,
  what_moved_minds TEXT,
  consensus TEXT,
  consensus_method TEXT,
  lessons_learned TEXT,
  problem_class TEXT,
  residue_risk JSONB,
  future_lookback NUMERIC(3,2),
  council_run_id UUID,
  duration_minutes INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_debate_records_subject ON debate_records(subject);
CREATE INDEX IF NOT EXISTS idx_debate_records_related_fact_id ON debate_records(related_fact_id);
CREATE INDEX IF NOT EXISTS idx_debate_records_council_run_id ON debate_records(council_run_id);
CREATE INDEX IF NOT EXISTS idx_debate_records_created_at ON debate_records(created_at);