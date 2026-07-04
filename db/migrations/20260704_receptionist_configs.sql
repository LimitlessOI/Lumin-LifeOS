-- SYNOPSIS: Database migration — 20260704_receptionist_configs.sql.
-- AIR-P1-001: receptionist_configs
CREATE TABLE IF NOT EXISTS receptionist_configs (
  id SERIAL PRIMARY KEY,
  customer_id INT NOT NULL,
  business_name TEXT NOT NULL,
  vapi_agent_id TEXT,
  phone_number TEXT,
  routing_rules JSONB,
  script_text TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receptionist_configs_customer_id ON receptionist_configs (customer_id);
CREATE INDEX IF NOT EXISTS idx_receptionist_configs_active ON receptionist_configs (active);
CREATE INDEX IF NOT EXISTS idx_receptionist_configs_vapi_agent_id ON receptionist_configs (vapi_agent_id);