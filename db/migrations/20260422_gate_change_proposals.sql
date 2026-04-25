-- North Star §2.6 ¶8 — Governed efficiency path: persisted proposals + council output.
-- No automatic gate removal; rows are audit trail for human + council workflow.

CREATE TABLE IF NOT EXISTS gate_change_proposals (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT,
  title TEXT NOT NULL,
  pain_summary TEXT NOT NULL,
  hypothesis_label TEXT NOT NULL CHECK (hypothesis_label IN ('THINK', 'GUESS')),
  steps_to_remove JSONB NOT NULL DEFAULT '[]'::jsonb,
  proposed_equivalence_metrics TEXT,
  status TEXT NOT NULL DEFAULT 'raised'
    CHECK (status IN ('raised', 'debated', 'approved', 'rejected', 'implemented')),
  council_output TEXT,
  council_model TEXT,
  council_verdict TEXT CHECK (
    council_verdict IS NULL OR council_verdict IN ('APPROVE', 'REJECT', 'DEFER', 'UNKNOWN')
  ),
  council_rounds_json JSONB,
  consensus_reached BOOLEAN,
  consensus_summary TEXT
);

ALTER TABLE gate_change_proposals
  ADD COLUMN IF NOT EXISTS council_rounds_json JSONB;

ALTER TABLE gate_change_proposals
  ADD COLUMN IF NOT EXISTS consensus_reached BOOLEAN;

ALTER TABLE gate_change_proposals
  ADD COLUMN IF NOT EXISTS consensus_summary TEXT;

CREATE INDEX IF NOT EXISTS idx_gate_change_proposals_status_created
  ON gate_change_proposals (status, created_at DESC);
