-- GLVAR Membership Dues Monitoring
-- Stores scraped dues items and tracks reminder history

CREATE TABLE IF NOT EXISTS glvar_dues_log (
  id               SERIAL PRIMARY KEY,
  scraped_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  description      TEXT        NOT NULL DEFAULT 'Unknown',
  amount           NUMERIC(10,2),
  due_date         DATE,
  status           TEXT,
  raw_text         JSONB,
  reminder_sent_at TIMESTAMPTZ,
  paid_at          TIMESTAMPTZ,
  notes            TEXT,

  UNIQUE (description, due_date)
);

CREATE INDEX IF NOT EXISTS idx_glvar_dues_due_date  ON glvar_dues_log (due_date);
CREATE INDEX IF NOT EXISTS idx_glvar_dues_scraped_at ON glvar_dues_log (scraped_at DESC);

-- GLVAR Violation / Compliance Notice Log
-- Populated by IMAP inbox scan 4× per day

CREATE TABLE IF NOT EXISTS glvar_violations_log (
  id           SERIAL PRIMARY KEY,
  detected_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  subject      TEXT        NOT NULL,
  from_address TEXT,
  uid          TEXT        NOT NULL,
  alerted      BOOLEAN     NOT NULL DEFAULT false,
  resolved_at  TIMESTAMPTZ,
  notes        TEXT,

  UNIQUE (uid)
);

CREATE INDEX IF NOT EXISTS idx_glvar_violations_detected ON glvar_violations_log (detected_at DESC);
