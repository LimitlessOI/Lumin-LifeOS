-- SYNOPSIS: Database migration — 20260704_create_behavioral_signals.sql.
CREATE TABLE IF NOT EXISTS behavioral_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  signals_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);