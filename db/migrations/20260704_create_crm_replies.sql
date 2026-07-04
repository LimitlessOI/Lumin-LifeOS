-- SYNOPSIS: Database migration — 20260704_create_crm_replies.sql.
CREATE TABLE IF NOT EXISTS crm_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_content TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_replies_received_at
  ON crm_replies (received_at);