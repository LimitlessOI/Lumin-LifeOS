-- SYNOPSIS: Database migration — 20230705_create_boldtrail_leads.sql.
-- Create table for storing BoldTrail lead data

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS boldtrail_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_boldtrail_leads_status
  ON boldtrail_leads (status);