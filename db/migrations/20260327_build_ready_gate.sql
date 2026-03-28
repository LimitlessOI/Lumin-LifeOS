-- ============================================================
-- Build Ready Gate
-- Amendment: docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md
--
-- Adds build_ready flag and readiness_checklist to projects.
-- The builder supervisor WILL NOT touch a project until
-- build_ready = TRUE — meaning the amendment has passed the
-- Pre-Build Readiness Checklist (competitor analysis, future
-- product landscape, adaptability strategy, beat-them plan).
-- ============================================================

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS build_ready            BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS readiness_checked_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS readiness_checked_by   TEXT,
  ADD COLUMN IF NOT EXISTS readiness_notes        TEXT,
  ADD COLUMN IF NOT EXISTS competitor_analysis    JSONB,   -- structured competitor data
  ADD COLUMN IF NOT EXISTS adaptability_score     INT      -- 0-100: how well we can absorb new ideas
    CHECK (adaptability_score IS NULL OR (adaptability_score >= 0 AND adaptability_score <= 100));

CREATE INDEX IF NOT EXISTS idx_projects_build_ready ON projects(build_ready) WHERE build_ready = TRUE;

-- Readiness checklist items stored as a JSONB array on each project.
-- Schema: [{ id, label, done, done_at, notes }]
-- Populated via POST /api/v1/projects/:id/readiness
COMMENT ON COLUMN projects.build_ready IS
  'Set TRUE only after amendment passes Pre-Build Readiness Checklist. Builder supervisor will not touch projects where this is FALSE.';

COMMENT ON COLUMN projects.competitor_analysis IS
  'Structured competitor data: [{name, url, strengths, weaknesses, our_edge, can_absorb}]';

COMMENT ON COLUMN projects.adaptability_score IS
  '0-100 score: how well can this system absorb new competitor innovations without a rewrite. 100 = fully adaptable via config/plugins, 0 = would require full rewrite.';
