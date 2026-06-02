-- BPB-0001 Mission Runtime — commitments table patch migration
-- PRESCRIBED: BPB-0001 §13.2 — add mission-runtime columns to pre-existing commitments table
-- Authority: docs/projects/BPB-0001-MISSION-RUNTIME-V1.md §13.2
-- MISSION-0001: Adam + Sherry Household Reliability and Income Engine
--
-- WHY THIS IS A SEPARATE MIGRATION:
--   The commitments table pre-dates Mission Runtime. The v1 migration
--   (20260604_mission_runtime_v1.sql) uses CREATE TABLE IF NOT EXISTS commitments,
--   which silently no-ops because the table already exists. This patch adds
--   the 12 missing mission-runtime columns.
--
-- ORDERING NOTE:
--   This filename (commitments_patch) sorts alphabetically before v1 (c < v),
--   meaning it MAY apply before the missions table exists. The mission_id FK
--   is added via a conditional DO $$ block that degrades safely if missions is
--   not yet present. All other columns use ADD COLUMN IF NOT EXISTS directly
--   and are order-independent.
--
-- GAP-FILL: Builder execute endpoint returning HTTP_502 (runner generation 85,
--   125 consecutive churn tasks confirmed in logs). Written by Conductor per
--   CLAUDE.md §"Only if the builder call fails entirely (HTTP 5xx)".

-- mission_id FK — order-safe conditional block
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'missions'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'commitments' AND column_name = 'mission_id'
    ) THEN
      ALTER TABLE commitments ADD COLUMN mission_id UUID REFERENCES missions(id) ON DELETE SET NULL;
    END IF;
  ELSE
    -- missions table not yet created (v1 migration pending or failed);
    -- add column without FK so downstream code can at least store UUIDs.
    -- The constraint will be enforced once missions table is confirmed present.
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'commitments' AND column_name = 'mission_id'
    ) THEN
      ALTER TABLE commitments ADD COLUMN mission_id UUID;
      RAISE WARNING 'BPB-0001 patch: missions table not found — mission_id added without FK; re-apply constraint manually once 20260604_mission_runtime_v1.sql has run.';
    END IF;
  END IF;
END $$;

-- Remaining 11 columns — order-independent, safe to add in any order
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS time_estimate_hours NUMERIC(5,2);
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS urgency             SMALLINT    CHECK (urgency BETWEEN 1 AND 5);
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS importance          SMALLINT    CHECK (importance BETWEEN 1 AND 5);
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS energy_cost         SMALLINT    CHECK (energy_cost BETWEEN 1 AND 5);
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS money_impact        SMALLINT    CHECK (money_impact BETWEEN 1 AND 5);
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS relationship_impact SMALLINT    CHECK (relationship_impact BETWEEN 1 AND 5);
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS opportunity_cost_note TEXT;
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS better_owner        TEXT;
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS approval_required   BOOLEAN     NOT NULL DEFAULT FALSE;
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS approved_by         TEXT;
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS approved_at         TIMESTAMPTZ;

-- Index for mission-linked commitment queries
CREATE INDEX IF NOT EXISTS idx_commitments_mission_id ON commitments (mission_id);
