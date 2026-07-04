-- SYNOPSIS: Database migration — 20260704_create_operator_consumption_ledger.sql.
CREATE TABLE IF NOT EXISTS operator_consumption_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);