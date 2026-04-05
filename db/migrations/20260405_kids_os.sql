-- @ssot docs/projects/AMENDMENT_34_KIDS_OS.md
--
-- Kids OS: personal development OS for children
-- Enrollment, win log, learning profile, sessions, integrity, welfare flags, future projections
--
-- Applied: 2026-04-05

-- Core child profile
CREATE TABLE IF NOT EXISTS kids_os_children (
  id                    SERIAL PRIMARY KEY,
  parent_user_id        INTEGER,  -- references lifeos_users when that table exists
  display_name          TEXT NOT NULL,  -- NOT real name - parent-assigned alias
  age                   INTEGER,
  grade_level           TEXT,
  learning_style        JSONB DEFAULT '{}',
  engagement_profile    JSONB DEFAULT '{}',
  interests             TEXT[] DEFAULT '{}',
  flags                 JSONB DEFAULT '{}',  -- misidentification flags, welfare flags
  hardship_protected    BOOLEAN DEFAULT false,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- Win log - every genuine win documented
CREATE TABLE IF NOT EXISTS kids_os_wins (
  id                SERIAL PRIMARY KEY,
  child_id          INTEGER NOT NULL REFERENCES kids_os_children(id),
  domain            TEXT NOT NULL,  -- reading, math, music, social, creative, etc
  win_description   TEXT NOT NULL,
  evidence          TEXT,           -- what specifically they did
  before_state      TEXT,           -- what they couldn't do before
  after_state       TEXT,           -- what they can do now
  celebrated        BOOLEAN DEFAULT false,
  logged_by         TEXT DEFAULT 'system',  -- system, teacher, parent
  occurred_at       TIMESTAMPTZ DEFAULT now()
);

-- Learning profile snapshots (rebuilt periodically)
CREATE TABLE IF NOT EXISTS kids_os_learning_profile (
  id                    SERIAL PRIMARY KEY,
  child_id              INTEGER NOT NULL REFERENCES kids_os_children(id),
  love_of_learning_score NUMERIC(4,1),  -- 0-100, THE primary metric
  curiosity_signals     JSONB DEFAULT '{}',
  confidence_baseline   NUMERIC(3,1),
  growth_edge           TEXT,           -- the one concept they're right on the boundary of
  misidentification_flags JSONB DEFAULT '{}',
  ai_synthesis          TEXT,
  is_current            BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_kids_learning_profile_current
  ON kids_os_learning_profile(child_id, is_current) WHERE is_current = true;

-- Session log
CREATE TABLE IF NOT EXISTS kids_os_sessions (
  id              SERIAL PRIMARY KEY,
  child_id        INTEGER NOT NULL REFERENCES kids_os_children(id),
  session_type    TEXT NOT NULL CHECK (session_type IN ('learning','practice','checkin','simulator','integrity','workshop')),
  domain          TEXT,
  duration_minutes INTEGER,
  engagement_level NUMERIC(3,1),  -- 1-10 from behavior signals
  curiosity_moments INTEGER DEFAULT 0,  -- number of "why" questions or tangents
  win_logged      BOOLEAN DEFAULT false,
  notes           TEXT,
  started_at      TIMESTAMPTZ DEFAULT now(),
  ended_at        TIMESTAMPTZ
);

-- Integrity score log (gamified for kids)
CREATE TABLE IF NOT EXISTS kids_os_integrity_log (
  id              SERIAL PRIMARY KEY,
  child_id        INTEGER NOT NULL REFERENCES kids_os_children(id),
  action_type     TEXT NOT NULL CHECK (action_type IN (
    'clear_ask',           -- asked for what they wanted clearly and honestly
    'graceful_no',         -- accepted a no with grace
    'commitment_kept',     -- kept a commitment they made
    'truth_told',          -- told truth when lying was easier
    'self_caught',         -- caught themselves manipulating, chose differently (2x points)
    'manipulation_detected' -- system detected manipulation pattern (no points, logged)
  )),
  points          INTEGER NOT NULL DEFAULT 1,
  description     TEXT,
  logged_by       TEXT DEFAULT 'system',
  occurred_at     TIMESTAMPTZ DEFAULT now()
);

-- Welfare flags for abuse detection / belonging tracking
CREATE TABLE IF NOT EXISTS kids_os_welfare_flags (
  id              SERIAL PRIMARY KEY,
  child_id        INTEGER NOT NULL REFERENCES kids_os_children(id),
  flag_type       TEXT NOT NULL CHECK (flag_type IN (
    'no_win_streak',        -- 5+ days without a win moment
    'confidence_drop',      -- sharp drop in confidence score
    'perfectionism_signal', -- 100%-or-failure pattern detected
    'fear_signal',          -- fear-based language pattern
    'learning_love_drop',   -- love of learning metric dropping
    'abuse_pattern'         -- pattern consistent with abuse - requires routing
  )),
  severity        TEXT CHECK (severity IN ('watch','concern','urgent')),
  evidence        JSONB,
  resolved        BOOLEAN DEFAULT false,
  routed_to       TEXT,   -- who was notified (never parents if they may be source)
  created_at      TIMESTAMPTZ DEFAULT now(),
  resolved_at     TIMESTAMPTZ
);

-- Future self projections for kids
CREATE TABLE IF NOT EXISTS kids_future_projections (
  id              SERIAL PRIMARY KEY,
  child_id        INTEGER NOT NULL REFERENCES kids_os_children(id),
  domain          TEXT NOT NULL,
  horizon_days    INTEGER NOT NULL,
  commitment_level JSONB,
  projection      JSONB,  -- milestones, narrative, projected level
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kids_os_wins_child ON kids_os_wins(child_id);
CREATE INDEX IF NOT EXISTS idx_kids_os_wins_domain ON kids_os_wins(domain);
CREATE INDEX IF NOT EXISTS idx_kids_os_sessions_child ON kids_os_sessions(child_id);
CREATE INDEX IF NOT EXISTS idx_kids_os_integrity_child ON kids_os_integrity_log(child_id);
CREATE INDEX IF NOT EXISTS idx_kids_welfare_child ON kids_os_welfare_flags(child_id, resolved);
