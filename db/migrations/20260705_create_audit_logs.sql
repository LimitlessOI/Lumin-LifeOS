-- SYNOPSIS: Database migration — 20260705_create_audit_logs.sql.
-- Enterprise AI Governance
-- Blueprint step: EAI-P1-001
-- Purpose: Store AI interaction logs for auditability and governance.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  actor TEXT NOT NULL,
  data_classification TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs (timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs (actor);
CREATE INDEX IF NOT EXISTS idx_audit_logs_data_classification ON audit_logs (data_classification);