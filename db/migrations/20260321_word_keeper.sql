-- Migration: 20260321_word_keeper
-- Amendment 16 — Word Keeper & Integrity Engine
-- All tables for commitment tracking, integrity scoring, mediation.

BEGIN;

-- ── Commitments ───────────────────────────────────────────────────────────────
-- Every tracked commitment: what was said, to whom, by when, and outcome.
CREATE TABLE IF NOT EXISTS commitments (
  id                BIGSERIAL PRIMARY KEY,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Who made it and to whom
  user_id           TEXT NOT NULL DEFAULT 'adam',
  to_person         TEXT,                          -- name of person committed to
  relationship      TEXT,                          -- 'spouse', 'colleague', 'client', 'self', 'other'

  -- What was committed
  raw_text          TEXT NOT NULL,                 -- exact words detected
  normalized_text   TEXT,                          -- AI-cleaned version: "what, by when"
  category          TEXT,                          -- 'work', 'family', 'personal', 'financial', 'health'
  deadline          TIMESTAMPTZ,                   -- when it must be done by
  deadline_raw      TEXT,                          -- original time expression ("by Friday", "tomorrow")

  -- Source
  detected_from     TEXT DEFAULT 'audio',          -- 'audio', 'manual', 'text'
  audio_clip_url    TEXT,                          -- encrypted clip URL (null if not captured)
  transcript_context TEXT,                         -- surrounding 30s of transcript for context
  confidence        NUMERIC(4,3),                  -- 0.0–1.0 detection confidence

  -- Status
  status            TEXT NOT NULL DEFAULT 'pending',
  -- pending, confirmed, kept, broken, honourable_exit, declined, renegotiated

  -- Outcome tracking
  confirmed_at      TIMESTAMPTZ,                   -- when user said YES to tracking
  completed_at      TIMESTAMPTZ,                   -- when marked done
  outcome_notes     TEXT,                          -- what actually happened

  -- Reminders
  remind_24h        BOOLEAN DEFAULT TRUE,
  remind_1h         BOOLEAN DEFAULT TRUE,
  remind_audible    BOOLEAN DEFAULT FALSE,
  reminder_24h_sent BOOLEAN DEFAULT FALSE,
  reminder_1h_sent  BOOLEAN DEFAULT FALSE,

  -- Calendar
  calendar_event_id TEXT,                          -- Google Calendar event ID if synced

  -- Scoring
  score_event_id    BIGINT                         -- FK to integrity_events once outcome recorded
);

CREATE INDEX IF NOT EXISTS idx_commitments_user    ON commitments (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commitments_status  ON commitments (status, deadline);
CREATE INDEX IF NOT EXISTS idx_commitments_person  ON commitments (to_person);

-- ── Integrity Events ──────────────────────────────────────────────────────────
-- Every event that changes the integrity score. Append-only.
CREATE TABLE IF NOT EXISTS integrity_events (
  id              BIGSERIAL PRIMARY KEY,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id         TEXT NOT NULL DEFAULT 'adam',
  commitment_id   BIGINT REFERENCES commitments(id),
  event_type      TEXT NOT NULL,
  -- kept_on_time, kept_late_communicated, kept_late, honourable_exit,
  -- broken_communicated, broken_no_notice, no_show,
  -- streak_7, streak_30, relationship_penalty, manual_adjustment
  points          INTEGER NOT NULL,                -- positive or negative
  score_before    INTEGER NOT NULL,
  score_after     INTEGER NOT NULL,
  notes           TEXT
);

CREATE INDEX IF NOT EXISTS idx_integrity_events_user ON integrity_events (user_id, created_at DESC);

-- ── Integrity Scores ──────────────────────────────────────────────────────────
-- Current score per user. One row per user, updated on each event.
CREATE TABLE IF NOT EXISTS integrity_scores (
  user_id               TEXT PRIMARY KEY DEFAULT 'adam',
  score                 INTEGER NOT NULL DEFAULT 500,  -- start at 500 (middle)
  level                 INTEGER NOT NULL DEFAULT 2,
  level_title           TEXT NOT NULL DEFAULT 'Building Trust',
  total_commitments     INTEGER NOT NULL DEFAULT 0,
  kept_count            INTEGER NOT NULL DEFAULT 0,
  broken_count          INTEGER NOT NULL DEFAULT 0,
  honourable_exit_count INTEGER NOT NULL DEFAULT 0,
  current_streak        INTEGER NOT NULL DEFAULT 0,
  longest_streak        INTEGER NOT NULL DEFAULT 0,
  last_event_at         TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default row for Adam
INSERT INTO integrity_scores (user_id, score, level, level_title)
VALUES ('adam', 500, 2, 'Building Trust')
ON CONFLICT (user_id) DO NOTHING;

-- ── Commitment Reminders ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commitment_reminders (
  id              BIGSERIAL PRIMARY KEY,
  commitment_id   BIGINT NOT NULL REFERENCES commitments(id) ON DELETE CASCADE,
  remind_at       TIMESTAMPTZ NOT NULL,
  type            TEXT NOT NULL,                   -- '24h', '1h', 'deadline', 'weekly_summary'
  channel         TEXT NOT NULL,                   -- 'sms', 'audible', 'overlay'
  status          TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed, skipped
  sent_at         TIMESTAMPTZ,
  message_text    TEXT
);

CREATE INDEX IF NOT EXISTS idx_reminders_pending ON commitment_reminders (remind_at, status)
  WHERE status = 'pending';

-- ── Mediator Sessions ─────────────────────────────────────────────────────────
-- Conflict de-escalation sessions. Private by default.
CREATE TABLE IF NOT EXISTS mediator_sessions (
  id              BIGSERIAL PRIMARY KEY,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id         TEXT NOT NULL DEFAULT 'adam',
  other_party     TEXT,                            -- name of other person (optional)
  trigger_method  TEXT,                            -- 'keyword', 'manual', 'voice_pattern'
  status          TEXT NOT NULL DEFAULT 'active',  -- active, analysis_ready, closed
  consent_a       BOOLEAN DEFAULT FALSE,           -- Adam consented to storage
  consent_b       BOOLEAN DEFAULT FALSE,           -- other party consented to storage
  consent_both    BOOLEAN DEFAULT FALSE,           -- TRUE only when both a AND b have consented

  -- Statements
  statement_a     TEXT,                            -- Adam's statement
  statement_b     TEXT,                            -- Other party's statement
  statement_a_at  TIMESTAMPTZ,
  statement_b_at  TIMESTAMPTZ,

  -- AI analysis (only stored if consent_both = true)
  ai_summary_a    TEXT,                            -- neutral summary of Adam's position
  ai_summary_b    TEXT,                            -- neutral summary of other position
  ai_needs_a      TEXT,                            -- what Adam likely needs
  ai_needs_b      TEXT,                            -- what other person likely needs
  deescalation_suggestions JSONB,                  -- array of 3 suggestions
  bridge_statements JSONB,                         -- what each person could say

  -- Safety
  crisis_detected BOOLEAN DEFAULT FALSE,
  crisis_phrase   TEXT                             -- the phrase that triggered safety flag
);

-- ── Rolling Transcripts ───────────────────────────────────────────────────────
-- 24-hour TTL. Auto-purged unless commitment detected.
CREATE TABLE IF NOT EXISTS word_keeper_transcripts (
  id              BIGSERIAL PRIMARY KEY,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
  user_id         TEXT NOT NULL DEFAULT 'adam',
  chunk_index     INTEGER,
  transcript_text TEXT NOT NULL,
  has_commitment  BOOLEAN DEFAULT FALSE,
  commitment_id   BIGINT REFERENCES commitments(id)
);

CREATE INDEX IF NOT EXISTS idx_transcripts_expires ON word_keeper_transcripts (expires_at);
CREATE INDEX IF NOT EXISTS idx_transcripts_user    ON word_keeper_transcripts (user_id, created_at DESC);

COMMIT;
