-- Migration: 20260329_lifeos_engine
-- LifeOS Phase 2 — The Engine
-- Outreach tasks, communication gateway, calendar rules
-- @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md

BEGIN;

-- ── Outreach Tasks ────────────────────────────────────────────────────────────
-- Things the system executes on the user's behalf.
CREATE TABLE IF NOT EXISTS lifeos_outreach_tasks (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,

  -- What to do
  channel         TEXT NOT NULL,  -- 'email'|'sms'|'call'|'calendar_invite'
  recipient_name  TEXT,
  recipient_email TEXT,
  recipient_phone TEXT,
  subject         TEXT,
  body            TEXT NOT NULL,

  -- Origination
  source          TEXT DEFAULT 'manual',  -- 'manual'|'commitment'|'system'
  source_ref      BIGINT,                 -- commitment_id or mirror_id

  -- Scheduling
  scheduled_at    TIMESTAMPTZ DEFAULT NOW(),
  execute_after   TIMESTAMPTZ,    -- don't execute before this time
  escalate_after  INTERVAL DEFAULT '48 hours',  -- re-prod if no response
  max_attempts    INTEGER DEFAULT 3,

  -- State
  status          TEXT NOT NULL DEFAULT 'pending',
  -- 'pending'|'executed'|'failed'|'cancelled'|'awaiting_response'
  attempts        INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  response        TEXT,            -- what came back (reply text, call outcome)
  response_at     TIMESTAMPTZ,
  outcome         TEXT,            -- 'replied'|'no_response'|'meeting_set'|'declined'|'error'

  approved        BOOLEAN DEFAULT TRUE,  -- system can act without approval unless false
  approved_at     TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_user_status   ON lifeos_outreach_tasks (user_id, status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_outreach_execute_after ON lifeos_outreach_tasks (execute_after, status) WHERE status='pending';

-- ── Calendar Rules ────────────────────────────────────────────────────────────
-- User-defined rules for protecting time and declining requests.
CREATE TABLE IF NOT EXISTS lifeos_calendar_rules (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  rule_type       TEXT NOT NULL,
  -- 'protect_block'|'decline_category'|'require_buffer'|'no_back_to_back'
  name            TEXT NOT NULL,
  description     TEXT,
  applies_to      TEXT[],         -- day names or categories
  time_start      TIME,
  time_end        TIME,
  action          TEXT DEFAULT 'decline',  -- 'decline'|'ask'|'move'
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Communication Log ─────────────────────────────────────────────────────────
-- Every inbound/outbound communication routed through the gateway.
CREATE TABLE IF NOT EXISTS lifeos_communication_log (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT REFERENCES lifeos_users(id) ON DELETE SET NULL,
  direction       TEXT NOT NULL,  -- 'inbound'|'outbound'
  channel         TEXT NOT NULL,  -- 'sms'|'call'|'email'
  from_party      TEXT,
  to_party        TEXT,
  body            TEXT,
  duration_s      INTEGER,        -- for calls
  screened        BOOLEAN DEFAULT FALSE,
  screen_decision TEXT,           -- 'pass'|'block'|'voicemail'|'forward'
  ai_summary      TEXT,
  linked_task_id  BIGINT REFERENCES lifeos_outreach_tasks(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comms_user     ON lifeos_communication_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comms_from     ON lifeos_communication_log (from_party, created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_outreach_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_outreach_updated ON lifeos_outreach_tasks;
CREATE TRIGGER trg_outreach_updated
  BEFORE UPDATE ON lifeos_outreach_tasks
  FOR EACH ROW EXECUTE FUNCTION update_outreach_updated_at();

COMMIT;
