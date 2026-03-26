-- Migration: 20260326_tc_interactions
-- Amendment 17 — TC interaction capture, lawful recording gate, coaching, and client memory extraction.

BEGIN;

CREATE TABLE IF NOT EXISTS tc_interactions (
  id                 BIGSERIAL PRIMARY KEY,
  transaction_id     BIGINT NOT NULL REFERENCES tc_transactions(id) ON DELETE CASCADE,
  interaction_type   TEXT NOT NULL DEFAULT 'in_person',
  contact_name       TEXT,
  contact_role       TEXT NOT NULL DEFAULT 'client',
  channel            TEXT,
  recording_mode     TEXT NOT NULL DEFAULT 'notes_only',
  recording_allowed  BOOLEAN NOT NULL DEFAULT FALSE,
  disclosure_status  TEXT NOT NULL DEFAULT 'notes_only',
  consent_basis      TEXT,
  status             TEXT NOT NULL DEFAULT 'open',
  started_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at           TIMESTAMPTZ,
  duration_seconds   INTEGER,
  transcript_text    TEXT,
  notes              TEXT,
  summary            TEXT,
  commitments        JSONB NOT NULL DEFAULT '[]'::jsonb,
  profile_updates    JSONB NOT NULL DEFAULT '[]'::jsonb,
  coaching_review    JSONB NOT NULL DEFAULT '{}'::jsonb,
  next_actions       JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tc_interactions_tx_started
  ON tc_interactions (transaction_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_tc_interactions_status
  ON tc_interactions (status, started_at DESC);

COMMIT;
