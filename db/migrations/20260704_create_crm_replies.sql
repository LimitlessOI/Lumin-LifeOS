-- SYNOPSIS: Database migration — 20260704_create_crm_replies.sql.
-- OCR-P1-005: Create CRM replies table for storing incoming message replies.

CREATE TABLE IF NOT EXISTS crm_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_content TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);