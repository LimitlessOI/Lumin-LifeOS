-- SYNOPSIS: Database migration — 20260704_create_agent_protocol_violations.sql.
-- Memory Intelligence blueprint step MI-P1-008
-- Create agent_protocol_violations table to log agent violations.

CREATE TABLE IF NOT EXISTS agent_protocol_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  task_type TEXT NOT NULL,
  violation_type TEXT NOT NULL,
  severity TEXT,
  details TEXT,
  evidence_text TEXT,
  detected_by UUID NOT NULL,
  source_route TEXT,
  related_fact_id UUID,
  related_debate_id UUID,
  auto_action TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_protocol_violations_agent_id
  ON agent_protocol_violations (agent_id);

CREATE INDEX IF NOT EXISTS idx_agent_protocol_violations_task_type
  ON agent_protocol_violations (task_type);

CREATE INDEX IF NOT EXISTS idx_agent_protocol_violations_violation_type
  ON agent_protocol_violations (violation_type);

CREATE INDEX IF NOT EXISTS idx_agent_protocol_violations_detected_by
  ON agent_protocol_violations (detected_by);

CREATE INDEX IF NOT EXISTS idx_agent_protocol_violations_created_at
  ON agent_protocol_violations (created_at);