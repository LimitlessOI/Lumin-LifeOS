-- Migration: 20260320_idea_vision_fields
-- Adds vision capture fields to the ideas table so builders know exactly what Adam wants
-- Also adds UX research + quality gate result storage

BEGIN;

-- Vision capture fields on ideas
ALTER TABLE ideas
  ADD COLUMN IF NOT EXISTS reference_url        TEXT,          -- URL to design inspiration or competitor
  ADD COLUMN IF NOT EXISTS user_flow            TEXT,          -- how the user moves through the feature
  ADD COLUMN IF NOT EXISTS target_audience      TEXT,          -- who this is for
  ADD COLUMN IF NOT EXISTS design_notes         TEXT,          -- visual/UX notes from Adam
  ADD COLUMN IF NOT EXISTS competitor_urls      TEXT[],        -- competitor examples to reference
  ADD COLUMN IF NOT EXISTS acceptance_criteria  TEXT,          -- what "done" looks like
  ADD COLUMN IF NOT EXISTS ux_research          JSONB,         -- cached research results
  ADD COLUMN IF NOT EXISTS quality_gate_result  JSONB,         -- last quality gate evaluation
  ADD COLUMN IF NOT EXISTS quality_score        NUMERIC(4,1),  -- 0.0 - 10.0
  ADD COLUMN IF NOT EXISTS quality_passed       BOOLEAN;       -- did it pass the gate?

-- Index for ideas that have vision data (useful for the builder)
CREATE INDEX IF NOT EXISTS idx_ideas_has_vision
  ON ideas (id)
  WHERE reference_url IS NOT NULL OR design_notes IS NOT NULL;

-- Index for quality gate failures (for review)
CREATE INDEX IF NOT EXISTS idx_ideas_quality_failed
  ON ideas (id)
  WHERE quality_passed = false;

COMMIT;
