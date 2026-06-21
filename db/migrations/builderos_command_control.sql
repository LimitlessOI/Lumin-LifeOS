-- SYNOPSIS: Database migration — builderos_command_control.sql.
-- BuilderOS Command & Control Phase 2 schema

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS builderos_command_control_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instruction TEXT NOT NULL,
    requested_by TEXT NOT NULL DEFAULT 'adam_remote',
    status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'verifier_failed', 'retrying', 'blocked', 'committed', 'deployed', 'proof_current', 'cancelled', 'halted', 'failed')),
    blocker TEXT NULL,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    result_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    receipts_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS builderos_command_control_jobs_status_created_at_idx
  ON builderos_command_control_jobs USING btree (status, created_at DESC);

CREATE TABLE IF NOT EXISTS builderos_command_control_state (
    key TEXT PRIMARY KEY,
    active BOOLEAN NOT NULL DEFAULT false,
    reason TEXT NULL,
    triggered_by TEXT NOT NULL DEFAULT 'adam_remote',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO builderos_command_control_state (key, active, reason, triggered_by, created_at, updated_at)
VALUES ('global_halt', false, NULL, 'adam_remote', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (key) DO NOTHING;
