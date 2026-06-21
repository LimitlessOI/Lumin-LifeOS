-- SYNOPSIS: Database migration — 20260513_repair_phase2_model_performance_chain.sql.
-- Repair Phase 2: model_performance chain + capability_map FK type mismatch
--
-- Root cause: model_performance.sql and capability_map.sql declared segment_id as UUID,
-- but project_segments.id is SERIAL (INTEGER). PostgreSQL rejects the FK at table creation,
-- so model_verdict_log was never created, causing dissent_tracking.sql to fail with
-- "model_verdict_log does not exist."
--
-- This repair:
--   (1) Ensures build_outcomes exists (governance_spec.sql may have failed on some deploys)
--   (2) Creates model_verdict_log with INT segment_id (corrected from UUID)
--   (3) Adds all columns from the failed ALTER TABLE in model_performance.sql
--   (4) Adds was_consensus_position and rebuilds views (dissent_tracking.sql content)
--   (5) Creates capability_map with INT segment_id (corrected from UUID)

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Ensure build_outcomes exists (depends on project_segments — must exist before model_verdict_log FK)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS build_outcomes (
  id                 SERIAL PRIMARY KEY,
  segment_id         INTEGER REFERENCES project_segments(id) ON DELETE SET NULL,
  project_slug       TEXT NOT NULL,
  council_review_id  INTEGER,          -- FK to builder_council_reviews(id) intentionally soft here
  shipped_cleanly    BOOLEAN,
  had_regression     BOOLEAN,
  adam_satisfaction  INTEGER CHECK (adam_satisfaction BETWEEN 1 AND 5),
  outcome_notes      TEXT,
  files_changed      JSONB,
  checks_passed      JSONB,
  checks_failed      JSONB,
  scored_at          TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_build_outcomes_segment ON build_outcomes(segment_id);
CREATE INDEX IF NOT EXISTS idx_build_outcomes_project ON build_outcomes(project_slug);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Create model_verdict_log — segment_id is INT (was UUID in original, mismatch fixed)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS model_verdict_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id    INT REFERENCES project_segments(id) ON DELETE CASCADE,
  lens          TEXT NOT NULL,
  model         TEXT NOT NULL,
  provider      TEXT NOT NULL,
  verdict       TEXT CHECK (verdict IN ('PROCEED', 'CAUTION', 'STOP', 'NEEDS_HUMAN')),
  latency_ms    INTEGER,
  tokens_used   INTEGER,
  cost_usd      NUMERIC(10, 6),
  raw_output    TEXT,
  logged_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add columns from model_performance.sql ALTER TABLE (idempotent)
ALTER TABLE model_verdict_log
  ADD COLUMN IF NOT EXISTS outcome_id UUID REFERENCES build_outcomes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verdict_was_correct BOOLEAN;

-- 4. Add column from dissent_tracking.sql ALTER TABLE (idempotent)
ALTER TABLE model_verdict_log
  ADD COLUMN IF NOT EXISTS was_consensus_position BOOLEAN;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_model_verdict_log_segment    ON model_verdict_log(segment_id);
CREATE INDEX IF NOT EXISTS idx_model_verdict_log_lens_model ON model_verdict_log(lens, model);
CREATE INDEX IF NOT EXISTS idx_model_verdict_log_logged_at  ON model_verdict_log(logged_at DESC);

-- Final model_performance_summary view — dissent_tracking version (most current)
-- DROP dependents first: CREATE OR REPLACE cannot rename/reorder columns on existing views.
DROP VIEW IF EXISTS model_lens_dissent_leader;
DROP VIEW IF EXISTS model_lens_winner;
DROP VIEW IF EXISTS model_performance_summary;

CREATE VIEW model_performance_summary AS
SELECT
  mvl.lens,
  mvl.model,
  mvl.provider,
  COUNT(*) AS total_verdicts,
  COUNT(*) FILTER (WHERE mvl.verdict_was_correct = true) AS correct_verdicts,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE mvl.verdict_was_correct = true)
    / NULLIF(COUNT(*) FILTER (WHERE mvl.verdict_was_correct IS NOT NULL), 0), 1
  ) AS accuracy_pct,
  COUNT(*) FILTER (WHERE mvl.was_consensus_position = true) AS consensus_verdicts,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE mvl.was_consensus_position = true AND mvl.verdict_was_correct = true)
    / NULLIF(COUNT(*) FILTER (WHERE mvl.was_consensus_position = true AND mvl.verdict_was_correct IS NOT NULL), 0), 1
  ) AS consensus_accuracy_pct,
  COUNT(*) FILTER (WHERE mvl.was_consensus_position = false) AS dissent_verdicts,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE mvl.was_consensus_position = false AND mvl.verdict_was_correct = true)
    / NULLIF(COUNT(*) FILTER (WHERE mvl.was_consensus_position = false AND mvl.verdict_was_correct IS NOT NULL), 0), 1
  ) AS dissent_accuracy_pct,
  ROUND(AVG(mvl.latency_ms)) AS avg_latency_ms,
  ROUND(AVG(mvl.cost_usd)::NUMERIC, 6) AS avg_cost_usd,
  SUM(mvl.cost_usd) AS total_cost_usd,
  MAX(mvl.logged_at) AS last_used
FROM model_verdict_log mvl
GROUP BY mvl.lens, mvl.model, mvl.provider;

CREATE OR REPLACE VIEW model_lens_winner AS
SELECT DISTINCT ON (lens)
  lens, model, provider, accuracy_pct, total_verdicts, avg_cost_usd,
  dissent_accuracy_pct, consensus_accuracy_pct
FROM model_performance_summary
WHERE total_verdicts >= 3
  AND accuracy_pct IS NOT NULL
ORDER BY lens, accuracy_pct DESC, avg_cost_usd ASC;

CREATE OR REPLACE VIEW model_lens_dissent_leader AS
SELECT DISTINCT ON (lens)
  lens, model, provider, dissent_accuracy_pct, dissent_verdicts, avg_cost_usd,
  accuracy_pct
FROM model_performance_summary
WHERE dissent_verdicts >= 3
  AND dissent_accuracy_pct IS NOT NULL
ORDER BY lens, dissent_accuracy_pct DESC, avg_cost_usd ASC;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. capability_map — segment_id is INT (was UUID in original, mismatch fixed)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS capability_map (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea             TEXT NOT NULL,
  source           TEXT,
  mapping_type     TEXT CHECK (mapping_type IN ('existing_module', 'extension_point', 'new_segment')) NOT NULL,
  target           TEXT NOT NULL,
  rationale        TEXT,
  suggested_segment JSONB,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'inserted')),
  segment_id       INT REFERENCES project_segments(id) ON DELETE SET NULL,
  reviewed_by      TEXT DEFAULT 'pending',
  analyzed_at      TIMESTAMPTZ DEFAULT NOW(),
  acted_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_capability_map_status       ON capability_map(status);
CREATE INDEX IF NOT EXISTS idx_capability_map_mapping_type ON capability_map(mapping_type);
CREATE INDEX IF NOT EXISTS idx_capability_map_analyzed_at  ON capability_map(analyzed_at DESC);
