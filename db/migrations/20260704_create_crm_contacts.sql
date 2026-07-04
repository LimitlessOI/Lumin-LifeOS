-- SYNOPSIS: Database migration — 20260704_create_crm_contacts.sql.
-- OCR-P1-001: CRM contacts table
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_email BOOLEAN NOT NULL DEFAULT false,
  consent_sms BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_created_at
  ON crm_contacts (created_at);