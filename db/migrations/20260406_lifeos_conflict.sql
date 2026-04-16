-- Migration: 20260406_lifeos_conflict.sql
-- Conflict Intelligence + Communication Coaching layer
-- Tables: conflict_consent, conflict_recordings, coaching_sessions, communication_patterns

BEGIN;

-- ── conflict_consent ─────────────────────────────────────────────────────────
-- Per-pair consent for live monitoring, recording, and post-conflict coaching.
-- Both users must grant each consent_type for it to be active.

CREATE TABLE IF NOT EXISTS conflict_consent (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  partner_user_id   BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  consent_type      TEXT NOT NULL,   -- 'live_interrupt' | 'recording' | 'post_coaching'
  granted           BOOLEAN NOT NULL DEFAULT FALSE,
  granted_at        TIMESTAMPTZ,
  revoked_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT conflict_consent_type_check CHECK (consent_type IN ('live_interrupt', 'recording', 'post_coaching')),
  UNIQUE (user_id, partner_user_id, consent_type)
);

-- ── conflict_recordings ──────────────────────────────────────────────────────
-- Captures a structured log of a conflict for later processing.

CREATE TABLE IF NOT EXISTS conflict_recordings (
  id                          BIGSERIAL PRIMARY KEY,
  session_code                TEXT UNIQUE NOT NULL,
  initiator_user_id           BIGINT REFERENCES lifeos_users(id) ON DELETE SET NULL,
  partner_user_id             BIGINT REFERENCES lifeos_users(id) ON DELETE SET NULL,
  initiator_label             TEXT NOT NULL,
  partner_label               TEXT NOT NULL,
  topic                       TEXT,
  transcript                  JSONB NOT NULL DEFAULT '[]',
  -- transcript: array of { speaker, content, timestamp, tone_flags }
  status                      TEXT NOT NULL DEFAULT 'recording',
  -- 'recording' | 'captured' | 'processing_together' | 'processing_separately' | 'complete'
  processing_mode             TEXT,
  -- 'together' | 'separate' | 'separate_then_together' | null
  initiator_coaching_complete BOOLEAN DEFAULT FALSE,
  partner_coaching_complete   BOOLEAN DEFAULT FALSE,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT conflict_recordings_status_check CHECK (
    status IN ('recording', 'captured', 'processing_together', 'processing_separately', 'complete')
  ),
  CONSTRAINT conflict_recordings_mode_check CHECK (
    processing_mode IS NULL OR processing_mode IN ('together', 'separate', 'separate_then_together')
  )
);

-- ── coaching_sessions ────────────────────────────────────────────────────────
-- One-on-one or joint AI communication coaching sessions.
-- Individual sessions are private — partner never sees them.

CREATE TABLE IF NOT EXISTS coaching_sessions (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  session_type  TEXT NOT NULL,
  -- 'post_conflict' | 'live_interrupt' | 'pattern_review' | 'proactive'
  recording_id  BIGINT REFERENCES conflict_recordings(id) ON DELETE SET NULL,
  perspective   TEXT NOT NULL DEFAULT 'individual',
  -- 'individual' | 'joint'
  turns         JSONB NOT NULL DEFAULT '[]',
  -- array of { speaker: 'user'|'coach', content, created_at }
  insights      JSONB DEFAULT NULL,
  -- extracted at session end: { patterns, triggers, strengths, growth_areas, nvc_moments }
  status        TEXT NOT NULL DEFAULT 'active',
  -- 'active' | 'completed'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT coaching_sessions_type_check CHECK (
    session_type IN ('post_conflict', 'live_interrupt', 'pattern_review', 'proactive')
  ),
  CONSTRAINT coaching_sessions_perspective_check CHECK (
    perspective IN ('individual', 'joint')
  ),
  CONSTRAINT coaching_sessions_status_check CHECK (
    status IN ('active', 'completed')
  )
);

-- ── communication_patterns ───────────────────────────────────────────────────
-- Accumulated per-user communication patterns learned from coaching sessions.

CREATE TABLE IF NOT EXISTS communication_patterns (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL,
  -- 'trigger' | 'escalator' | 'de_escalator' | 'strength' | 'growth_area'
  description  TEXT NOT NULL,
  frequency    INTEGER NOT NULL DEFAULT 1,
  last_seen    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  example      TEXT,   -- anonymized excerpt illustrating the pattern
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT communication_patterns_type_check CHECK (
    pattern_type IN ('trigger', 'escalator', 'de_escalator', 'strength', 'growth_area')
  )
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_conflict_consent       ON conflict_consent (user_id, partner_user_id);
CREATE INDEX IF NOT EXISTS idx_recordings_code        ON conflict_recordings (session_code);
CREATE INDEX IF NOT EXISTS idx_coaching_user          ON coaching_sessions (user_id, status);
CREATE INDEX IF NOT EXISTS idx_patterns_user          ON communication_patterns (user_id, pattern_type);

-- ── updated_at triggers ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_conflict_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_conflict_recordings_updated_at ON conflict_recordings;
CREATE TRIGGER trg_conflict_recordings_updated_at
  BEFORE UPDATE ON conflict_recordings
  FOR EACH ROW EXECUTE FUNCTION set_conflict_updated_at();

DROP TRIGGER IF EXISTS trg_coaching_sessions_updated_at ON coaching_sessions;
CREATE TRIGGER trg_coaching_sessions_updated_at
  BEFORE UPDATE ON coaching_sessions
  FOR EACH ROW EXECUTE FUNCTION set_conflict_updated_at();

COMMIT;
