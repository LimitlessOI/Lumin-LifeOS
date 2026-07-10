-- SYNOPSIS: Database migration — 20240601_tc_intake_e2e.sql.
-- Migration: add intake_runs and document_qa_results for transaction intake tracking

CREATE TABLE IF NOT EXISTS intake_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid,
  email_message_id text,
  skyslope_file_id text,
  status text,
  run_log jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_qa_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_run_id uuid,
  document_name text,
  issues jsonb,
  passed boolean,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intake_runs_transaction_id
  ON intake_runs (transaction_id);

CREATE INDEX IF NOT EXISTS idx_intake_runs_email_message_id
  ON intake_runs (email_message_id);

CREATE INDEX IF NOT EXISTS idx_intake_runs_skyslope_file_id
  ON intake_runs (skyslope_file_id);

CREATE INDEX IF NOT EXISTS idx_intake_runs_status
  ON intake_runs (status);

CREATE INDEX IF NOT EXISTS idx_document_qa_results_intake_run_id
  ON document_qa_results (intake_run_id);

CREATE INDEX IF NOT EXISTS idx_document_qa_results_passed
  ON document_qa_results (passed);