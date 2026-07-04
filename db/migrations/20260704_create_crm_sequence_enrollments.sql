-- SYNOPSIS: Database migration — 20260704_create_crm_sequence_enrollments.sql.
-- OCR-P1-003: CRM sequence enrollments table
CREATE TABLE IF NOT EXISTS crm_sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL,
  sequence_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_sequence_enrollments_contact_id
  ON crm_sequence_enrollments (contact_id);

CREATE INDEX IF NOT EXISTS idx_crm_sequence_enrollments_sequence_id
  ON crm_sequence_enrollments (sequence_id);