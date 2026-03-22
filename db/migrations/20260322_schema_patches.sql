-- Migration: 20260322_schema_patches
-- Patches for columns missing from existing tables.
-- Safe to run multiple times (all use IF NOT EXISTS / DO NOTHING patterns).

BEGIN;

-- Add updated_at to improvement_proposals if missing
ALTER TABLE improvement_proposals
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Add updated_at to ideas if missing
ALTER TABLE ideas
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Add approved_at to ideas if missing
ALTER TABLE ideas
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

COMMIT;
