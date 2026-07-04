-- SYNOPSIS: Database migration — 20260704_create_transactions_table.sql.
-- Purpose: Create transactions table to store transaction data.
-- Product: TC Service
-- Blueprint step: TC-P1-001

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions (status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions (created_at);