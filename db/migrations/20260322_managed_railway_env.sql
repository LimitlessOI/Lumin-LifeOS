-- Migration: 20260322_managed_railway_env
-- Managed Railway environment variables + sync audit ledger.
-- Safe to run multiple times.

BEGIN;

CREATE TABLE IF NOT EXISTS managed_railway_env_vars (
  id BIGSERIAL PRIMARY KEY,
  env_name TEXT NOT NULL UNIQUE,
  encrypted_value TEXT NOT NULL,
  value_sha256 TEXT NOT NULL,
  description TEXT,
  managed BOOLEAN NOT NULL DEFAULT TRUE,
  allow_overwrite BOOLEAN NOT NULL DEFAULT TRUE,
  sync_on_boot BOOLEAN NOT NULL DEFAULT TRUE,
  target_service_id TEXT,
  target_environment_id TEXT,
  last_synced_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_sync_error TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_managed_railway_env_vars_managed
  ON managed_railway_env_vars (managed, sync_on_boot);

CREATE TABLE IF NOT EXISTS railway_env_sync_audit (
  id BIGSERIAL PRIMARY KEY,
  env_name TEXT,
  action TEXT NOT NULL,
  actor TEXT,
  status TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_railway_env_sync_audit_created_at
  ON railway_env_sync_audit (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_railway_env_sync_audit_env_name
  ON railway_env_sync_audit (env_name);

COMMIT;
