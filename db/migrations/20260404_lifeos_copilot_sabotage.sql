-- ============================================================
-- Migration: LifeOS Copilot, Emergency Repair, Self-Sabotage
-- Date: 2026-04-04
-- Amendments: AMENDMENT_21_LIFEOS_CORE (Layer 5)
-- ============================================================

-- Self-sabotage pattern detection log
CREATE TABLE IF NOT EXISTS self_sabotage_log (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  pattern_id       TEXT NOT NULL,
  confidence       NUMERIC(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  evidence         TEXT,
  framing          TEXT,
  ai_insight       TEXT,
  detected_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged     BOOLEAN NOT NULL DEFAULT false,
  acknowledged_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_self_sabotage_log_user_id
  ON self_sabotage_log(user_id);

CREATE INDEX IF NOT EXISTS idx_self_sabotage_log_pattern_id
  ON self_sabotage_log(user_id, pattern_id);

-- Emergency repair records
CREATE TABLE IF NOT EXISTS emergency_repairs (
  id                  SERIAL PRIMARY KEY,
  user_id             INTEGER NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  situation_summary   TEXT,
  repair_type         TEXT NOT NULL CHECK (repair_type IN ('relationship','self','commitment','crisis')),
  triage_data         JSONB,
  activated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved            BOOLEAN,
  resolved_at         TIMESTAMPTZ,
  repair_approach     TEXT,
  outcome_notes       TEXT
);

CREATE INDEX IF NOT EXISTS idx_emergency_repairs_user_id
  ON emergency_repairs(user_id);

CREATE INDEX IF NOT EXISTS idx_emergency_repairs_activated_at
  ON emergency_repairs(user_id, activated_at DESC);

-- Live CoPilot sessions
CREATE TABLE IF NOT EXISTS copilot_sessions (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  session_type   TEXT NOT NULL CHECK (session_type IN ('negotiation','hard_conversation','decision','presentation','interview','other')),
  context        TEXT,
  goal           TEXT,
  outcome        TEXT,
  outcome_notes  TEXT,
  insights       JSONB,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed')),
  started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_copilot_sessions_user_id
  ON copilot_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_copilot_sessions_status
  ON copilot_sessions(user_id, status);

-- Live CoPilot messages
CREATE TABLE IF NOT EXISTS copilot_messages (
  id          SERIAL PRIMARY KEY,
  session_id  INTEGER NOT NULL REFERENCES copilot_sessions(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user','copilot','system')),
  content     TEXT NOT NULL,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_copilot_messages_session_id
  ON copilot_messages(session_id, sent_at);
