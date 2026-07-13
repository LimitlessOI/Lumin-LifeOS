-- SYNOPSIS: Database migration — 20260422_lifeos_biological_age.sql.
-- Create biological_age table for user-level biological aging metrics
CREATE TABLE IF NOT EXISTS biological_age (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  pheno_age NUMERIC,
  vo2_max NUMERIC,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS biological_age_user_id_idx
  ON biological_age (user_id);

-- Create lab_results table for user-level lab result payloads
CREATE TABLE IF NOT EXISTS lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  results JSONB,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lab_results_user_id_idx
  ON lab_results (user_id);