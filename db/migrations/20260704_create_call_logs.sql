-- SYNOPSIS: Database migration — 20260704_create_call_logs.sql.
-- Create call_logs table for AI Receptionist call handling records
CREATE TABLE IF NOT EXISTS call_logs (
  id SERIAL PRIMARY KEY,
  config_id INTEGER NOT NULL,
  caller_number TEXT DEFAULT NULL,
  duration_seconds INTEGER DEFAULT NULL,
  intent TEXT DEFAULT NULL,
  lead_score TEXT DEFAULT NULL,
  summary TEXT DEFAULT NULL,
  transcript TEXT DEFAULT NULL,
  routed_to TEXT DEFAULT NULL,
  call_time TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_logs_config_id ON call_logs (config_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_call_time ON call_logs (call_time);