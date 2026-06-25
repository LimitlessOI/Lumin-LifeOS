-- SYNOPSIS: Database migration — 20260625_blueprint_intake.sql.
-- Blueprint Intake Sessions: stores state for all three intake flows
-- (backfill from amendment, greenfield conversation, adjustment patch)
CREATE TABLE IF NOT EXISTS blueprint_intake_sessions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name         TEXT NOT NULL,
  amendment_file       TEXT,
  flow_type            TEXT NOT NULL DEFAULT 'backfill'
                         CHECK (flow_type IN ('backfill','greenfield','adjustment')),
  status               TEXT NOT NULL DEFAULT 'scanning'
                         CHECK (status IN (
                           'scanning','extracting','generating',
                           'arc_review','gap_collection','ready',
                           'executing','complete','failed'
                         )),
  codebase_scan_json   JSONB NOT NULL DEFAULT '{}',
  extracted_intent_json JSONB NOT NULL DEFAULT '{}',
  gaps_json            JSONB NOT NULL DEFAULT '[]',
  gap_answers_json     JSONB NOT NULL DEFAULT '{}',
  blueprint_json       JSONB,
  arc_report_json      JSONB,
  conversation_json    JSONB NOT NULL DEFAULT '[]',
  blueprint_file       TEXT,
  target_mission_id    TEXT,
  owner_id             TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intake_product ON blueprint_intake_sessions(product_name);
CREATE INDEX IF NOT EXISTS idx_intake_status  ON blueprint_intake_sessions(status);
CREATE INDEX IF NOT EXISTS idx_intake_flow    ON blueprint_intake_sessions(flow_type);
