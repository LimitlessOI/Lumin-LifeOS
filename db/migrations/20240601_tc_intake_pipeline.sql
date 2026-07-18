-- SYNOPSIS: Database migration — 20240601_tc_intake_pipeline.sql.
-- Migration for intake pipeline, billing, and showing feedback related tables
-- Idempotent: creates only missing tables and indexes

CREATE TABLE IF NOT EXISTS tc_intake_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid,
  status text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tc_intake_runs_agent_id
  ON tc_intake_runs (agent_id);

CREATE INDEX IF NOT EXISTS idx_tc_intake_runs_status
  ON tc_intake_runs (status);

CREATE TABLE IF NOT EXISTS tc_billing_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid,
  status text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tc_billing_subscriptions_agent_id
  ON tc_billing_subscriptions (agent_id);

CREATE INDEX IF NOT EXISTS idx_tc_billing_subscriptions_status
  ON tc_billing_subscriptions (status);

CREATE TABLE IF NOT EXISTS tc_showing_feedback_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid,
  status text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tc_showing_feedback_requests_agent_id
  ON tc_showing_feedback_requests (agent_id);

CREATE INDEX IF NOT EXISTS idx_tc_showing_feedback_requests_status
  ON tc_showing_feedback_requests (status);

CREATE TABLE IF NOT EXISTS tc_offer_prep_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid,
  status text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tc_offer_prep_runs_agent_id
  ON tc_offer_prep_runs (agent_id);

CREATE INDEX IF NOT EXISTS idx_tc_offer_prep_runs_status
  ON tc_offer_prep_runs (status);

CREATE TABLE IF NOT EXISTS tc_mobile_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid,
  status text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tc_mobile_approvals_agent_id
  ON tc_mobile_approvals (agent_id);

CREATE INDEX IF NOT EXISTS idx_tc_mobile_approvals_status
  ON tc_mobile_approvals (status);