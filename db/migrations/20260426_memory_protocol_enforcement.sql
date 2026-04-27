-- @ssot docs/projects/AMENDMENT_39_MEMORY_INTELLIGENCE.md
-- Anti-corner-cutting enforcement: protocol violations + task authority.

CREATE TABLE IF NOT EXISTS agent_protocol_violations (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id          VARCHAR(100) NOT NULL,
  task_type         VARCHAR(100) NOT NULL,
  violation_type    VARCHAR(50)  NOT NULL,
  severity          VARCHAR(10)  NOT NULL DEFAULT 'medium', -- low | medium | high | critical
  details           TEXT,
  evidence_text     TEXT,
  detected_by       VARCHAR(100) NOT NULL DEFAULT 'system',
  source_route      TEXT,
  related_fact_id   UUID         REFERENCES epistemic_facts(id),
  related_debate_id UUID         REFERENCES debate_records(id),
  auto_action       VARCHAR(10)  NOT NULL DEFAULT 'none', -- none | watch | block
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_protocol_violations_agent_task
  ON agent_protocol_violations(agent_id, task_type, created_at DESC);

CREATE TABLE IF NOT EXISTS agent_task_authority (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id         VARCHAR(100) NOT NULL,
  task_type        VARCHAR(100) NOT NULL,
  authority_status VARCHAR(10)  NOT NULL DEFAULT 'allowed', -- allowed | watch | blocked
  reason           TEXT         NOT NULL,
  notes            TEXT,
  metadata         JSONB,
  set_by           VARCHAR(100) NOT NULL DEFAULT 'system',
  expires_at       TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_agent_task_authority UNIQUE (agent_id, task_type)
);

CREATE INDEX IF NOT EXISTS idx_agent_task_authority_lookup
  ON agent_task_authority(agent_id, task_type, expires_at);
