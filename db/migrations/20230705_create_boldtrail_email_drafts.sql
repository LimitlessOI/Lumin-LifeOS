-- SYNOPSIS: Database migration — 20230705_create_boldtrail_email_drafts.sql.
CREATE TABLE IF NOT EXISTS boldtrail_email_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_content TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boldtrail_email_drafts_status
  ON boldtrail_email_drafts (status);

CREATE INDEX IF NOT EXISTS idx_boldtrail_email_drafts_created_at
  ON boldtrail_email_drafts (created_at);