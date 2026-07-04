-- SYNOPSIS: Database migration — 20260705_create_daily_spend.sql.
CREATE TABLE IF NOT EXISTS daily_spend (
  date TIMESTAMPTZ PRIMARY KEY DEFAULT NOW(),
  usd_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00
);

CREATE INDEX IF NOT EXISTS idx_daily_spend_date ON daily_spend (date);