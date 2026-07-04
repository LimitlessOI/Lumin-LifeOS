-- SYNOPSIS: Database migration — 20260704_create_receptionist_configs.sql.
-- AR-P1-001: receptionist_configs table
CREATE TABLE IF NOT EXISTS receptionist_configs (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  business_name TEXT NOT NULL,
  vapi_agent_id TEXT DEFAULT NULL,
  phone_number TEXT DEFAULT NULL,
  routing_rules JSONB DEFAULT NULL,
  script_text TEXT DEFAULT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receptionist_configs_customer_id
  ON receptionist_configs (customer_id);

CREATE INDEX IF NOT EXISTS idx_receptionist_configs_active
  ON receptionist_configs (active);