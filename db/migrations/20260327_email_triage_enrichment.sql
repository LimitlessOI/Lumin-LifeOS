-- TC email triage enrichment
-- Adds message identity and preview text for better routing and workspace visibility.

ALTER TABLE email_triage_log
  ADD COLUMN IF NOT EXISTS message_id TEXT,
  ADD COLUMN IF NOT EXISTS preview_text TEXT;

CREATE INDEX IF NOT EXISTS idx_email_triage_message_id ON email_triage_log (message_id);
