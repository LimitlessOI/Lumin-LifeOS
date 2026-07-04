-- SYNOPSIS: Database migration — 20260704_create_agent_performance.sql.
-- Memory Intelligence: agent performance tracking
CREATE TABLE IF NOT EXISTS agent_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  task_type TEXT NOT NULL,
  prediction TEXT,
  outcome TEXT NOT NULL,
  confidence_at_time NUMERIC(3,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_performance_agent_id ON agent_performance(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_performance_task_type ON agent_performance(task_type);
CREATE INDEX IF NOT EXISTS idx_agent_performance_created_at ON agent_performance(created_at);