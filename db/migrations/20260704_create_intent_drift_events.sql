-- SYNOPSIS: Database migration — 20260704_create_intent_drift_events.sql.
CREATE TABLE IF NOT EXISTS intent_drift_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asked TEXT NOT NULL,
  delivered TEXT NOT NULL,
  drift_reason TEXT,
  agent_id UUID NOT NULL,
  related_fact_id UUID,
  resolved TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intent_drift_events_agent_id
  ON intent_drift_events (agent_id);

CREATE INDEX IF NOT EXISTS idx_intent_drift_events_related_fact_id
  ON intent_drift_events (related_fact_id);

CREATE INDEX IF NOT EXISTS idx_intent_drift_events_created_at
  ON intent_drift_events (created_at);