-- @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
-- Persist TransactionDesk form inventory and operator handling guidance.

CREATE TABLE IF NOT EXISTS tc_td_form_knowledge (
  id BIGSERIAL PRIMARY KEY,
  transaction_id BIGINT REFERENCES tc_transactions(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'td_scrape',
  form_name TEXT NOT NULL,
  role_hint TEXT,
  source_text TEXT,
  machine_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  handling_playbook JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence NUMERIC(4,3),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (transaction_id, source, form_name)
);

CREATE INDEX IF NOT EXISTS idx_tc_td_form_knowledge_tx ON tc_td_form_knowledge (transaction_id);
CREATE INDEX IF NOT EXISTS idx_tc_td_form_knowledge_seen ON tc_td_form_knowledge (last_seen_at DESC);

ALTER TABLE tc_td_form_knowledge
  ADD COLUMN IF NOT EXISTS machine_schema JSONB NOT NULL DEFAULT '{}'::jsonb;
