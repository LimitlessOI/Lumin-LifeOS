-- Email Triage Log
-- Stores all scanned emails with AI/rule-based category

CREATE TABLE IF NOT EXISTS email_triage_log (
  id              SERIAL PRIMARY KEY,
  uid             TEXT        NOT NULL,
  received_at     TIMESTAMPTZ NOT NULL,
  from_address    TEXT,
  subject         TEXT        NOT NULL DEFAULT '(no subject)',
  category        TEXT        NOT NULL, -- tc_contract, tc_deadline, client, glvar, time_sensitive, fyi
  action_required BOOLEAN     NOT NULL DEFAULT false,
  alerted_at      TIMESTAMPTZ,
  actioned_at     TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (uid)
);

CREATE INDEX IF NOT EXISTS idx_email_triage_received    ON email_triage_log (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_triage_category    ON email_triage_log (category);
CREATE INDEX IF NOT EXISTS idx_email_triage_unactioned  ON email_triage_log (action_required, actioned_at) WHERE actioned_at IS NULL;
