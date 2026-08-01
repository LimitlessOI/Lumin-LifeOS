-- SYNOPSIS: Database migration — 20260802_create_sentry_site_builder_gate_log.sql.
-- Log for the scheduled SENTRY Site Builder pre-alpha gate (scripts/sentry-site-builder-schedule.mjs).
CREATE TABLE IF NOT EXISTS sentry_site_builder_gate_log (
  id SERIAL PRIMARY KEY,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  report_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sentry_site_builder_gate_log_generated_at
  ON sentry_site_builder_gate_log (generated_at);
