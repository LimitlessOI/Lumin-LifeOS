-- Email triage intelligence upgrade
-- Adds urgency scoring, brief summaries, negotiation intel, spam tracking, and TC auto-queue

ALTER TABLE email_triage_log
  ADD COLUMN IF NOT EXISTS urgency_score    INT          DEFAULT NULL,  -- 1 (noise) to 10 (drop everything)
  ADD COLUMN IF NOT EXISTS brief            TEXT         DEFAULT NULL,  -- one sentence: what is this email
  ADD COLUMN IF NOT EXISTS why_adam         TEXT         DEFAULT NULL,  -- why Adam must personally handle (null = system handles)
  ADD COLUMN IF NOT EXISTS negotiation_intel TEXT        DEFAULT NULL,  -- leverage or advantage spotted (null = none)
  ADD COLUMN IF NOT EXISTS spam_deleted     BOOLEAN      DEFAULT FALSE, -- true = moved to Trash automatically
  ADD COLUMN IF NOT EXISTS auto_tc_queued   BOOLEAN      DEFAULT FALSE, -- true = kicked into TC pipeline
  ADD COLUMN IF NOT EXISTS auto_tc_result   JSONB        DEFAULT NULL;  -- result of TC auto-handling

CREATE INDEX IF NOT EXISTS idx_email_triage_urgency
  ON email_triage_log (urgency_score DESC NULLS LAST)
  WHERE actioned_at IS NULL AND spam_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_email_triage_negintel
  ON email_triage_log (created_at DESC)
  WHERE negotiation_intel IS NOT NULL;

-- Spam sender block list — any sender in here gets auto-deleted on arrival
CREATE TABLE IF NOT EXISTS email_spam_senders (
  id          SERIAL PRIMARY KEY,
  address     TEXT NOT NULL UNIQUE,
  reason      TEXT,
  blocked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spam_senders_address ON email_spam_senders (address);
