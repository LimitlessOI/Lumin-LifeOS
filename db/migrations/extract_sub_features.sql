-- SYNOPSIS: Database migration — extract_sub_features.sql.
-- db/migrations/extract_sub_features.sql
-- This migration creates the 'extracted_sub_features' table to store sub-feature data.

CREATE TABLE IF NOT EXISTS extracted_sub_features (
  id SERIAL PRIMARY KEY,
  feature_name VARCHAR(255) NOT NULL,
  feature_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
