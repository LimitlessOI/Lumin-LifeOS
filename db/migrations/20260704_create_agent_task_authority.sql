-- SYNOPSIS: Database migration — 20260704_create_agent_task_authority.sql.
-- Memory Intelligence blueprint: MI-P1-009
-- Purpose: Create agent_task_authority table to manage agent task authorities.

CREATE TABLE IF NOT EXISTS agent_task_authority (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  task_type TEXT NOT NULL,
  authority_status TEXT NOT NULL,
  reason TEXT,
  notes TEXT,
  metadata JSONB,
  set_by UUID,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_task_authority_agent_id
  ON agent_task_authority (agent_id);

CREATE INDEX IF NOT EXISTS idx_agent_task_authority_task_type
  ON agent_task_authority (task_type);

CREATE INDEX IF NOT EXISTS idx_agent_task_authority_authority_status
  ON agent_task_authority (authority_status);

CREATE INDEX IF NOT EXISTS idx_agent_task_authority_expires_at
  ON agent_task_authority (expires_at);