-- SYNOPSIS: Database migration — 20260705_create_tco_customers.sql.
CREATE TABLE IF NOT EXISTS tco_customers (
  customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tco_customers_customer_name
  ON tco_customers (customer_name);