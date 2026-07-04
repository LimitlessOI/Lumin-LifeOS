-- SYNOPSIS: Database migration — 20260705_create_kingsman_audit_log.sql.
-- Kingsman Protocol audit log table for threat patterns and evidence
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS kingsman_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pattern JSONB NOT NULL,
  evidence JSONB NOT NULL,
  consensus TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_kingsman_audit_log_timestamp
  ON kingsman_audit_log (timestamp);

CREATE INDEX IF NOT EXISTS idx_kingsman_audit_log_consensus
  ON kingsman_audit_log (consensus);

CREATE INDEX IF NOT EXISTS idx_kingsman_audit_log_pattern
  ON kingsman_audit_log USING GIN (pattern);

CREATE INDEX IF NOT EXISTS idx_kingsman_audit_log_evidence
  ON kingsman_audit_log USING GIN (evidence);