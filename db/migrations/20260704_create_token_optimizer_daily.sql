-- SYNOPSIS: Database migration — 20260704_create_token_optimizer_daily.sql.
-- TAO-P1-006: Create token_optimizer_daily table for daily token optimization logs.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS token_optimizer_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE INDEX IF NOT EXISTS idx_token_optimizer_daily_id
  ON token_optimizer_daily (id);