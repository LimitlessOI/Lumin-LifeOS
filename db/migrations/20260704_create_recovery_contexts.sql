-- SYNOPSIS: Database migration — 20260704_create_recovery_contexts.sql.
-- Create table to store user recovery contexts and consent
CREATE TABLE IF NOT EXISTS recovery_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  context_data JSONB NOT NULL,
  consent_given BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_recovery_contexts_user_id
  ON recovery_contexts(user_id);