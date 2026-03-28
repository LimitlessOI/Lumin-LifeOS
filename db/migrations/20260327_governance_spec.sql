-- ============================================================
-- Governance Spec Upgrade
-- Adds segment spec fields, review tiers, market sensitivity,
-- and outcome scoring to the builder system.
-- @ssot docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md
-- ============================================================

-- Review tier and segment spec on project_segments
ALTER TABLE project_segments
  ADD COLUMN IF NOT EXISTS review_tier TEXT NOT NULL DEFAULT 'tier_1'
    CHECK (review_tier IN ('tier_0', 'tier_1', 'tier_2', 'tier_3')),
  ADD COLUMN IF NOT EXISTS allowed_files JSONB,
  ADD COLUMN IF NOT EXISTS exact_outcome TEXT,
  ADD COLUMN IF NOT EXISTS required_checks JSONB DEFAULT '["node --check"]'::jsonb,
  ADD COLUMN IF NOT EXISTS rollback_note TEXT;

COMMENT ON COLUMN project_segments.review_tier IS
  'tier_0=skip council, tier_1=consequences+Adam, tier_2=full 4-lens, tier_3=full+debate+human required';
COMMENT ON COLUMN project_segments.allowed_files IS
  'JSON array of file paths the builder is allowed to write. Empty=skip segment. Builder refuses writes outside this list.';
COMMENT ON COLUMN project_segments.exact_outcome IS
  'What done looks like. Required for builder to proceed. If null, segment is skipped with warning.';
COMMENT ON COLUMN project_segments.required_checks IS
  'JSON array of shell commands that must pass after build before PR is opened.';
COMMENT ON COLUMN project_segments.rollback_note IS
  'How to undo this segment if it needs to be reverted.';

-- Market sensitivity on projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS market_sensitive BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN projects.market_sensitive IS
  'When TRUE, Trend Scout lens runs on every segment. When FALSE, Trend Scout only runs on tier_2+ segments.';

-- Outcome scoring table
CREATE TABLE IF NOT EXISTS build_outcomes (
  id                 SERIAL PRIMARY KEY,
  segment_id         INTEGER REFERENCES project_segments(id),
  project_slug       TEXT NOT NULL,
  council_review_id  INTEGER REFERENCES builder_council_reviews(id),
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

COMMENT ON TABLE build_outcomes IS
  'Post-merge outcome scoring. Feeds council model selection and Adam profile accuracy.';

-- Index for outcome queries
CREATE INDEX IF NOT EXISTS idx_build_outcomes_segment ON build_outcomes(segment_id);
CREATE INDEX IF NOT EXISTS idx_build_outcomes_project ON build_outcomes(project_slug);
