-- SYNOPSIS: Database migration — 20260816000001_create_taloa_chatgpt_relay_turns_table.sql.
-- @ssot docs/products/universal-overlay/PRODUCT_HOME.md
CREATE TABLE IF NOT EXISTS taloa_chatgpt_relay_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_taloa_chatgpt_relay_turns_task_id ON taloa_chatgpt_relay_turns(task_id);