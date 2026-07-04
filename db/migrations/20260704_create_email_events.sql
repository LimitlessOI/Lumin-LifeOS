-- SYNOPSIS: Database migration — 20260704_create_email_events.sql.
CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_events_event_type ON email_events (event_type);
CREATE INDEX IF NOT EXISTS idx_email_events_occurred_at ON email_events (occurred_at);