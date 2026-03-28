-- ============================================================
-- Builder Council Review Tables
-- Amendment: docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md
--
-- Tables:
--   builder_council_reviews  — every pre-build council review stored here
--   adam_decision_profile    — learning Adam's decision patterns over time
-- ============================================================

-- ── Builder Council Reviews ───────────────────────────────────────────────────
-- One row per segment reviewed. Stores all four lens responses + final verdict.
-- The builder supervisor reads this before spawning any agent.
CREATE TABLE IF NOT EXISTS builder_council_reviews (
  id               SERIAL PRIMARY KEY,
  segment_id       INT NOT NULL REFERENCES project_segments(id) ON DELETE CASCADE,
  verdict          TEXT NOT NULL CHECK (verdict IN ('PROCEED','CAUTION','STOP','NEEDS_HUMAN')),
  guidance         TEXT,                -- injected into builder prompt when CAUTION
  perspectives     JSONB,               -- full lens responses array
  consensus_reached BOOLEAN DEFAULT TRUE,
  debate_ran       BOOLEAN DEFAULT FALSE,
  persona_used     TEXT,                -- which great-mind persona was applied
  reviewed_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_council_reviews_segment ON builder_council_reviews(segment_id);
CREATE INDEX IF NOT EXISTS idx_council_reviews_verdict ON builder_council_reviews(verdict);
CREATE INDEX IF NOT EXISTS idx_council_reviews_reviewed ON builder_council_reviews(reviewed_at DESC);

COMMENT ON TABLE builder_council_reviews IS
  'Every pre-build council review. Verdict must be PROCEED or CAUTION for builder to continue.';

-- ── Adam Decision Profile ─────────────────────────────────────────────────────
-- Collects real Adam decisions so the "What would Adam do?" lens gets smarter.
-- Seed data comes from builder-council-review.js ADAM_SEED_PROFILE constant.
-- Real data is populated when Adam resolves pending_adam items or overrides builder decisions.
CREATE TABLE IF NOT EXISTS adam_decision_profile (
  id               SERIAL PRIMARY KEY,
  segment_id       INT REFERENCES project_segments(id) ON DELETE SET NULL,
  project_slug     TEXT,
  context          TEXT NOT NULL,       -- summary of what the decision was about
  predicted_choice TEXT,               -- what the AI predicted Adam would do
  actual_choice    TEXT,               -- what Adam actually chose (populated later)
  was_correct      BOOLEAN,            -- predicted_choice == actual_choice
  notes            TEXT,               -- Adam's reasoning (if provided)
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  resolved_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_adam_profile_correct  ON adam_decision_profile(was_correct);
CREATE INDEX IF NOT EXISTS idx_adam_profile_slug     ON adam_decision_profile(project_slug);
CREATE INDEX IF NOT EXISTS idx_adam_profile_created  ON adam_decision_profile(created_at DESC);

-- Running accuracy view — what % of the time do we correctly predict Adam?
CREATE OR REPLACE VIEW adam_prediction_accuracy AS
SELECT
  COUNT(*) FILTER (WHERE actual_choice IS NOT NULL)                           AS total_resolved,
  COUNT(*) FILTER (WHERE was_correct = TRUE)                                  AS correct,
  ROUND(
    COUNT(*) FILTER (WHERE was_correct = TRUE)::numeric /
    NULLIF(COUNT(*) FILTER (WHERE actual_choice IS NOT NULL), 0) * 100, 1
  )                                                                            AS accuracy_pct,
  COUNT(*) FILTER (WHERE actual_choice IS NULL)                               AS pending_resolution
FROM adam_decision_profile;

COMMENT ON TABLE adam_decision_profile IS
  'Tracks how well the system predicts Adam''s choices. As accuracy approaches 100%, the Adam filter becomes a reliable proxy for his judgment.';

COMMENT ON VIEW adam_prediction_accuracy IS
  'Live accuracy score: SELECT * FROM adam_prediction_accuracy;';

-- ── persona column on projects ────────────────────────────────────────────────
-- Stores which Great Minds persona the council should use for this project's reviews.
-- Defaults to musk (first-principles, delete before add — fits a lean startup best).
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS council_persona TEXT DEFAULT 'musk'
    CHECK (council_persona IN ('edison','tesla','musk','jobs'));

COMMENT ON COLUMN projects.council_persona IS
  'Which Great Minds persona to apply during pre-build council reviews for this project.';
