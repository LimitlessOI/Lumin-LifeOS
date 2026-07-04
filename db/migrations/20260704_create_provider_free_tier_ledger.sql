-- SYNOPSIS: Database migration — 20260704_create_provider_free_tier_ledger.sql.
CREATE TABLE IF NOT EXISTS provider_free_tier_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);