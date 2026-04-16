-- Migration: 20260328_lifeos_core
-- LifeOS Phase 1 — The Mirror
-- Commitments, Integrity Score, Joy Score, daily mirror log
--
-- @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md

BEGIN;

-- ── Users / Profiles ──────────────────────────────────────────────────────────
-- Multi-person from day one. Adam + Sherry each have a row.
-- user_handle is a short slug: 'adam', 'sherry', etc.
CREATE TABLE IF NOT EXISTS lifeos_users (
  id              BIGSERIAL PRIMARY KEY,
  user_handle     TEXT NOT NULL UNIQUE,
  display_name    TEXT NOT NULL,
  timezone        TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  be_statement    TEXT,    -- "I am someone who..." — the identity anchor
  do_statement    TEXT,    -- "I consistently..." — the action pattern
  have_vision     TEXT,    -- "My life looks like..." — the outcome vision
  truth_style     TEXT DEFAULT 'direct',   -- 'direct'|'gentle'|'coaching' — how hard truths land best
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO lifeos_users (user_handle, display_name, be_statement)
VALUES ('adam', 'Adam', NULL)
ON CONFLICT (user_handle) DO NOTHING;

-- ── Commitments ───────────────────────────────────────────────────────────────
-- Every promise made — to self, to Sherry, to anyone.
-- Captured from: conversation (auto-extracted), manual entry, or voice.
CREATE TABLE IF NOT EXISTS commitments (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,

  -- What was committed
  title             TEXT NOT NULL,
  description       TEXT,
  committed_to      TEXT,              -- who this was committed to (self, sherry, client, etc.)

  -- Source
  source            TEXT DEFAULT 'manual',  -- 'conversation'|'manual'|'voice'|'system'
  source_ref        TEXT,             -- conversation_id or message_id if auto-extracted

  -- Timing
  due_at            TIMESTAMPTZ,      -- when it's due
  remind_at         TIMESTAMPTZ,      -- when to prod (system sets this)
  remind_interval   INTERVAL,         -- if recurring prod (e.g. every 2 days)
  snoozed_until     TIMESTAMPTZ,      -- user snoozed the prod

  -- State
  status            TEXT NOT NULL DEFAULT 'open',
  -- 'open'|'in_progress'|'kept'|'broken'|'deferred'|'cancelled'
  kept_at           TIMESTAMPTZ,
  broken_at         TIMESTAMPTZ,
  broken_reason     TEXT,

  -- Weight for Integrity Score
  weight            INTEGER DEFAULT 1,   -- 1=small, 2=medium, 3=important, 5=critical
  is_public         BOOLEAN DEFAULT FALSE, -- shared to household view

  -- Prod state
  prod_count        INTEGER DEFAULT 0,
  last_prod_at      TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commitments_user_status ON commitments (user_id, status);
CREATE INDEX IF NOT EXISTS idx_commitments_due ON commitments (due_at) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_commitments_remind ON commitments (remind_at) WHERE status = 'open';

-- ── Commitment Prod Log ───────────────────────────────────────────────────────
-- Every time the system nudged the user about a commitment.
CREATE TABLE IF NOT EXISTS commitment_prods (
  id              BIGSERIAL PRIMARY KEY,
  commitment_id   BIGINT NOT NULL REFERENCES commitments(id) ON DELETE CASCADE,
  channel         TEXT NOT NULL DEFAULT 'overlay',  -- 'overlay'|'sms'|'push'
  message         TEXT,
  user_response   TEXT,   -- 'snoozed'|'done'|'cancelled'|'ignored'
  responded_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prods_commitment ON commitment_prods (commitment_id);

-- ── Integrity Score Log ───────────────────────────────────────────────────────
-- Computed daily. Full breakdown stored so the score is explainable.
CREATE TABLE IF NOT EXISTS integrity_score_log (
  id                    BIGSERIAL PRIMARY KEY,
  user_id               BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  score_date            DATE NOT NULL,

  -- Component scores (each 0–100)
  commitment_score      NUMERIC(5,2),   -- commitments kept / commitments due in window
  health_score          NUMERIC(5,2),   -- health check-ins done, goals met
  inner_work_score      NUMERIC(5,2),   -- reflection, journaling, practices
  generosity_score      NUMERIC(5,2),   -- giving actions logged
  repair_score          NUMERIC(5,2),   -- repair actions after ruptures

  -- Composite
  total_score           NUMERIC(5,2),
  delta_7d              NUMERIC(5,2),   -- change vs 7 days ago
  delta_30d             NUMERIC(5,2),   -- change vs 30 days ago

  -- Raw inputs for auditability
  commitments_due       INTEGER DEFAULT 0,
  commitments_kept      INTEGER DEFAULT 0,
  commitments_broken    INTEGER DEFAULT 0,
  health_checkins_done  INTEGER DEFAULT 0,
  inner_work_entries    INTEGER DEFAULT 0,
  generosity_actions    INTEGER DEFAULT 0,
  repair_actions        INTEGER DEFAULT 0,

  computed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, score_date)
);

CREATE INDEX IF NOT EXISTS idx_integrity_user_date ON integrity_score_log (user_id, score_date DESC);

-- ── Joy Check-ins ─────────────────────────────────────────────────────────────
-- Manual + AI-inferred. What created or depleted joy today.
CREATE TABLE IF NOT EXISTS joy_checkins (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  checkin_date    DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Overall scores
  joy_score       INTEGER CHECK (joy_score BETWEEN 1 AND 10),
  peace_score     INTEGER CHECK (peace_score BETWEEN 1 AND 10),
  energy_score    INTEGER CHECK (energy_score BETWEEN 1 AND 10),

  -- What created vs depleted (free text + tags)
  joy_sources     TEXT[],       -- e.g. ['morning_walk', 'deep_conversation', 'creative_work']
  joy_drains      TEXT[],       -- e.g. ['email_overload', 'conflict', 'poor_sleep']
  notes           TEXT,

  -- Source
  source          TEXT DEFAULT 'manual',  -- 'manual'|'ai_inferred'|'voice'
  inferred_from   TEXT,          -- conversation_id if AI-inferred

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, checkin_date)   -- one check-in per user per day; upsert on conflict
);

CREATE INDEX IF NOT EXISTS idx_joy_user_date ON joy_checkins (user_id, checkin_date DESC);
CREATE INDEX IF NOT EXISTS idx_joy_sources ON joy_checkins USING GIN (joy_sources);
CREATE INDEX IF NOT EXISTS idx_joy_drains ON joy_checkins USING GIN (joy_drains);

-- ── Joy Score Log ─────────────────────────────────────────────────────────────
-- Rolling computed Joy Score — 7-day and 30-day averages, trend direction.
CREATE TABLE IF NOT EXISTS joy_score_log (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  score_date      DATE NOT NULL,

  avg_joy_7d      NUMERIC(4,2),
  avg_peace_7d    NUMERIC(4,2),
  avg_energy_7d   NUMERIC(4,2),
  avg_joy_30d     NUMERIC(4,2),

  top_sources_7d  TEXT[],    -- most frequent joy sources over last 7 days
  top_drains_7d   TEXT[],    -- most frequent joy drains

  trend           TEXT,      -- 'rising'|'flat'|'falling'
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, score_date)
);

CREATE INDEX IF NOT EXISTS idx_joy_score_user_date ON joy_score_log (user_id, score_date DESC);

-- ── Daily Mirror Log ──────────────────────────────────────────────────────────
-- One row per user per day: the hard truth delivered, today's intention.
CREATE TABLE IF NOT EXISTS daily_mirror_log (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  mirror_date     DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Scores at time of mirror
  integrity_score NUMERIC(5,2),
  joy_score       NUMERIC(4,2),
  open_commitments INTEGER DEFAULT 0,
  overdue_commitments INTEGER DEFAULT 0,

  -- Today's intention (identity-layer)
  intention       TEXT,        -- "Today I am someone who..."

  -- The hard truth
  hard_truth      TEXT,        -- what the system surfaced; calibrated to truth_style
  hard_truth_topic TEXT,       -- which area: 'commitments'|'health'|'relationships'|'purpose'|'integrity'

  -- Did the user engage with the mirror?
  viewed_at       TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, mirror_date)
);

CREATE INDEX IF NOT EXISTS idx_mirror_user_date ON daily_mirror_log (user_id, mirror_date DESC);

-- ── Health Check-ins ──────────────────────────────────────────────────────────
-- Simple daily health signals. Wearable integration feeds here later.
CREATE TABLE IF NOT EXISTS health_checkins (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  checkin_date    DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Sleep
  sleep_hours     NUMERIC(4,2),
  sleep_quality   INTEGER CHECK (sleep_quality BETWEEN 1 AND 5),

  -- Vitals (manual until Apple Watch integration)
  resting_hr      INTEGER,
  hrv             INTEGER,       -- heart rate variability (ms)
  weight_lbs      NUMERIC(5,1),

  -- Food & drink (simple)
  water_oz        INTEGER,
  alcohol_drinks  INTEGER DEFAULT 0,
  foods_logged    TEXT[],        -- free-form, AI-normalizes later
  glucose_notes   TEXT,          -- CGM notes until real integration

  -- Energy & mood
  energy_score    INTEGER CHECK (energy_score BETWEEN 1 AND 10),
  mood_score      INTEGER CHECK (mood_score BETWEEN 1 AND 10),

  -- Medications / supplements
  medications_taken TEXT[],

  notes           TEXT,
  source          TEXT DEFAULT 'manual',

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_health_user_date ON health_checkins (user_id, checkin_date DESC);

-- ── Inner Work Log ────────────────────────────────────────────────────────────
-- Practices, reflection, therapy sessions, journaling — anything inner.
CREATE TABLE IF NOT EXISTS inner_work_log (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  work_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  practice_type   TEXT NOT NULL,
  -- 'journaling'|'meditation'|'therapy'|'prayer'|'breathwork'|'reflection'|'gratitude'|'other'
  duration_min    INTEGER,
  notes           TEXT,
  insight         TEXT,          -- what landed; what shifted
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inner_work_user_date ON inner_work_log (user_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_inner_work_type ON inner_work_log (user_id, practice_type);

-- ── Updated_at triggers ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_lifeos_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_lifeos_users_updated ON lifeos_users;
CREATE TRIGGER trg_lifeos_users_updated
  BEFORE UPDATE ON lifeos_users
  FOR EACH ROW EXECUTE FUNCTION update_lifeos_updated_at();

DROP TRIGGER IF EXISTS trg_commitments_updated ON commitments;
CREATE TRIGGER trg_commitments_updated
  BEFORE UPDATE ON commitments
  FOR EACH ROW EXECUTE FUNCTION update_lifeos_updated_at();

COMMIT;
