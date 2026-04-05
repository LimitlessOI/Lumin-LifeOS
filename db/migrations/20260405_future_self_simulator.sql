-- Migration: 20260405_future_self_simulator.sql
-- Future Self Simulator + Commitment Simulator + Workshop of the Mind
-- @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md

-- ── Future Self Simulator ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS future_self_projections (
  id                   SERIAL PRIMARY KEY,
  user_id              INTEGER NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  domain               TEXT    NOT NULL,
  commitment_level     JSONB   NOT NULL DEFAULT '{}',
  target_horizon_days  INTEGER NOT NULL,
  baseline_snapshot    JSONB   NOT NULL DEFAULT '{}',
  projection           JSONB   NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fsp_user_id  ON future_self_projections (user_id);
CREATE INDEX IF NOT EXISTS idx_fsp_domain   ON future_self_projections (user_id, domain);

CREATE TABLE IF NOT EXISTS practice_sessions (
  id                     SERIAL PRIMARY KEY,
  user_id                INTEGER NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  domain                 TEXT    NOT NULL,
  duration_minutes       INTEGER NOT NULL DEFAULT 0,
  quality_score          NUMERIC(3,1),
  notes                  TEXT,
  velocity_contribution  NUMERIC(5,3),
  recorded_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ps_user_id  ON practice_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_ps_domain   ON practice_sessions (user_id, domain);

-- ── Workshop of the Mind ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workshop_sessions (
  id                 SERIAL PRIMARY KEY,
  user_id            INTEGER NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  session_type       TEXT    NOT NULL,
  context            TEXT,
  intention          TEXT,
  anchor_phrase      TEXT,
  insight            TEXT,
  integration_notes  TEXT,
  status             TEXT    NOT NULL DEFAULT 'active',
  messages           JSONB   NOT NULL DEFAULT '[]',
  started_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ws_user_id  ON workshop_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_ws_status   ON workshop_sessions (user_id, status);
