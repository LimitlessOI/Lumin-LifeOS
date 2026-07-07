-- SYNOPSIS: Repair email_suppressions + outreach_log schema for NotificationService.
-- @ssot docs/products/site-builder/PRODUCT_HOME.md
-- OCR migrations (20260704) may have created minimal tables missing columns NotificationService expects.

ALTER TABLE email_suppressions ADD COLUMN IF NOT EXISTS suppressed BOOLEAN DEFAULT TRUE;
ALTER TABLE email_suppressions ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE email_suppressions ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE email_suppressions ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE email_suppressions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE email_suppressions ADD COLUMN IF NOT EXISTS suppressed_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_suppressions_email_unique ON email_suppressions (lower(email));

ALTER TABLE outreach_log ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE outreach_log ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE email_events ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE email_events ADD COLUMN IF NOT EXISTS message_id TEXT;
ALTER TABLE email_events ADD COLUMN IF NOT EXISTS recipient TEXT;
ALTER TABLE email_events ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'info';
ALTER TABLE email_events ADD COLUMN IF NOT EXISTS payload JSONB;
ALTER TABLE email_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
