-- ============================================================
-- Project Governance System
-- Amendment: docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md
--
-- Tables:
--   projects          — one row per active project, links to SSOT amendment
--   project_segments  — build plan steps with estimate + actual hours
--   estimation_log    — per-segment accuracy history for self-calibration
--   pending_adam      — anything blocked on Adam (approval/decision/credential)
-- ============================================================

-- ── Projects ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id                    SERIAL PRIMARY KEY,
  slug                  TEXT UNIQUE NOT NULL,       -- e.g. 'command_center'
  name                  TEXT NOT NULL,
  amendment_path        TEXT,                       -- relative path to .md file
  manifest_path         TEXT,                       -- relative path to .manifest.json
  lifecycle             TEXT DEFAULT 'experimental' CHECK (lifecycle IN ('experimental','production','deprecated')),
  status                TEXT DEFAULT 'active'       CHECK (status IN ('active','paused','complete','archived')),
  priority              TEXT DEFAULT 'normal'       CHECK (priority IN ('critical','high','normal','low')),
  phase                 TEXT,                       -- e.g. 'core-infrastructure', 'optimization'
  stability_class       TEXT DEFAULT 'needs-review' CHECK (stability_class IN ('safe','needs-review','high-risk')),
  current_focus         TEXT,                       -- what is being worked on right now
  last_worked_on        TIMESTAMPTZ,
  last_verified_at      TIMESTAMPTZ,
  verification_passed   BOOLEAN,
  estimation_accuracy   NUMERIC(5,2),               -- running average accuracy %
  total_segments        INT DEFAULT 0,
  completed_segments    INT DEFAULT 0,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── Project Segments (build plan checklist) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS project_segments (
  id               SERIAL PRIMARY KEY,
  project_id       INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done','blocked','skipped')),
  stability_class  TEXT DEFAULT 'safe' CHECK (stability_class IN ('safe','needs-review','high-risk')),
  estimated_hours  NUMERIC(6,2),
  actual_hours     NUMERIC(6,2),
  sort_order       INT DEFAULT 0,
  is_next_task     BOOLEAN DEFAULT FALSE,
  blocker_note     TEXT,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Estimation Log (accuracy tracking for self-calibration) ──────────────────
CREATE TABLE IF NOT EXISTS estimation_log (
  id               SERIAL PRIMARY KEY,
  project_id       INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  segment_id       INT NOT NULL REFERENCES project_segments(id) ON DELETE CASCADE,
  estimated_hours  NUMERIC(6,2) NOT NULL,
  actual_hours     NUMERIC(6,2) NOT NULL,
  accuracy_pct     NUMERIC(6,2),  -- (1 - abs(actual-est)/est) * 100, capped 0-100
  over_under       TEXT CHECK (over_under IN ('over','under','exact')),
  delta_hours      NUMERIC(6,2),  -- actual - estimated (negative = came in early)
  logged_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── Pending Adam (anything blocked on Adam) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS pending_adam (
  id               SERIAL PRIMARY KEY,
  project_id       INT REFERENCES projects(id) ON DELETE SET NULL,
  project_slug     TEXT,
  title            TEXT NOT NULL,
  description      TEXT,
  type             TEXT NOT NULL CHECK (type IN ('approval','decision','credential','review','other')),
  priority         TEXT DEFAULT 'normal' CHECK (priority IN ('urgent','normal','low')),
  context          JSONB,          -- any extra structured data
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  resolved_at      TIMESTAMPTZ,
  resolved_by      TEXT,
  resolved_notes   TEXT,
  is_resolved      BOOLEAN DEFAULT FALSE
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_projects_slug        ON projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_status      ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_lifecycle   ON projects(lifecycle);
CREATE INDEX IF NOT EXISTS idx_segments_project     ON project_segments(project_id);
CREATE INDEX IF NOT EXISTS idx_segments_status      ON project_segments(status);
CREATE INDEX IF NOT EXISTS idx_segments_next        ON project_segments(is_next_task) WHERE is_next_task = TRUE;
CREATE INDEX IF NOT EXISTS idx_estimation_project   ON estimation_log(project_id);
CREATE INDEX IF NOT EXISTS idx_estimation_segment   ON estimation_log(segment_id);
CREATE INDEX IF NOT EXISTS idx_pending_adam_resolved ON pending_adam(is_resolved);
CREATE INDEX IF NOT EXISTS idx_pending_adam_priority ON pending_adam(priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pending_adam_project  ON pending_adam(project_id);

-- ── Trigger: updated_at auto-stamp ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS segments_updated_at ON project_segments;
CREATE TRIGGER segments_updated_at
  BEFORE UPDATE ON project_segments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
