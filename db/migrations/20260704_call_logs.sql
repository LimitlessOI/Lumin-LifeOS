-- SYNOPSIS: Database migration — 20260704_call_logs.sql.
CREATE TABLE IF NOT EXISTS call_logs (
  id SERIAL PRIMARY KEY,
  config_id INT NOT NULL,
  caller_number TEXT,
  duration_seconds INT,
  intent TEXT,
  lead_score TEXT,
  summary TEXT,
  transcript TEXT,
  routed_to TEXT,
  call_time TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_logs_config_id ON call_logs (config_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_call_time ON call_logs (call_time);