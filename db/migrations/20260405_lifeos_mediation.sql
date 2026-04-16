-- Migration: 20260405_lifeos_mediation.sql
-- LifeOS Mediation Engine — consent-first AI-facilitated conflict resolution
-- Both parties agree to the process; AI is a neutral facilitator only.

BEGIN;

-- ── mediation_sessions ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mediation_sessions (
  id                       BIGSERIAL PRIMARY KEY,
  session_code             TEXT        UNIQUE NOT NULL,
  initiator_user_id        BIGINT      REFERENCES lifeos_users(id) ON DELETE SET NULL,
  initiator_label          TEXT        NOT NULL,
  respondent_user_id       BIGINT      REFERENCES lifeos_users(id) ON DELETE SET NULL,
  respondent_label         TEXT,
  respondent_email         TEXT,
  topic                    TEXT        NOT NULL,
  status                   TEXT        NOT NULL DEFAULT 'invited',
  -- 'invited' | 'active' | 'paused' | 'resolved' | 'closed_no_agreement' | 'abandoned'
  session_type             TEXT        NOT NULL DEFAULT 'personal',
  -- 'personal' | 'business' | 'family'
  initiator_consented_at   TIMESTAMPTZ,
  respondent_consented_at  TIMESTAMPTZ,
  initiator_ready          BOOLEAN     DEFAULT FALSE,
  respondent_ready         BOOLEAN     DEFAULT FALSE,
  current_speaker          TEXT,
  -- 'initiator' | 'respondent' | 'mediator' — who currently has the floor
  round_number             INTEGER     DEFAULT 0,
  agreement_text           TEXT,
  initiator_signed_at      TIMESTAMPTZ,
  respondent_signed_at     TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── mediation_turns ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mediation_turns (
  id              BIGSERIAL PRIMARY KEY,
  session_id      BIGINT NOT NULL REFERENCES mediation_sessions(id) ON DELETE CASCADE,
  speaker         TEXT   NOT NULL,
  -- 'initiator' | 'respondent' | 'mediator'
  speaker_label   TEXT,
  content         TEXT   NOT NULL,
  turn_type       TEXT   NOT NULL,
  -- 'opening' | 'statement' | 'reflection' | 'clarification' | 'common_ground'
  -- | 'proposal' | 'acceptance' | 'rejection' | 'agreement' | 'closing'
  ai_reflection   TEXT,
  -- what the mediator AI heard (populated after AI processes this turn)
  underlying_need TEXT,
  -- the need or feeling the AI detected beneath the spoken words
  round_number    INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── mediation_agreements ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mediation_agreements (
  id                  BIGSERIAL PRIMARY KEY,
  session_id          BIGINT NOT NULL REFERENCES mediation_sessions(id) ON DELETE CASCADE,
  agreement_text      TEXT   NOT NULL,
  initiator_accepted  BOOLEAN DEFAULT FALSE,
  respondent_accepted BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_mediation_sessions_code
  ON mediation_sessions(session_code);

CREATE INDEX IF NOT EXISTS idx_mediation_sessions_users
  ON mediation_sessions(initiator_user_id, respondent_user_id);

CREATE INDEX IF NOT EXISTS idx_mediation_turns_session
  ON mediation_turns(session_id, created_at);

-- ── updated_at trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION mediation_sessions_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mediation_sessions_updated_at ON mediation_sessions;
CREATE TRIGGER trg_mediation_sessions_updated_at
  BEFORE UPDATE ON mediation_sessions
  FOR EACH ROW EXECUTE FUNCTION mediation_sessions_set_updated_at();

COMMIT;
