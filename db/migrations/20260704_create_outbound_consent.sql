-- SYNOPSIS: Database migration — 20260704_create_outbound_consent.sql.
-- OCR-P1-008: outbound consent table for outreach
-- Stores consent flags for email and SMS outreach channels

CREATE TABLE IF NOT EXISTS outbound_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_email BOOLEAN NOT NULL DEFAULT false,
  consent_sms BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbound_consent_created_at
  ON outbound_consent (created_at);