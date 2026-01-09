-- ╔══════════════════════════════════════════════════════════════════════════════════╗
-- ║                TCO LEADS TABLE + STRIPE INTEGRATION                              ║
-- ║          Lead capture from cost analyzer + Stripe payment tracking              ║
-- ╚══════════════════════════════════════════════════════════════════════════════════╝

-- TCO Leads table (from cost analyzer)
CREATE TABLE IF NOT EXISTS tco_leads (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,

  -- Analysis data
  monthly_spend DECIMAL(10, 2),
  providers JSONB, -- Array of providers they use
  use_case VARCHAR(100),
  volume VARCHAR(50),

  -- Estimated savings (from analyzer)
  monthly_savings_estimate DECIMAL(10, 2),
  net_savings_estimate DECIMAL(10, 2),
  savings_percent_estimate DECIMAL(5, 2),

  -- Lead tracking
  source VARCHAR(100) DEFAULT 'cost_analyzer', -- Where lead came from
  converted BOOLEAN DEFAULT FALSE, -- Did they sign up?
  customer_id INTEGER REFERENCES tco_customers(id),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tco_leads_email ON tco_leads(email);
CREATE INDEX IF NOT EXISTS idx_tco_leads_converted ON tco_leads(converted);
CREATE INDEX IF NOT EXISTS idx_tco_leads_created ON tco_leads(created_at DESC);

-- Add Stripe fields to tco_customers table
ALTER TABLE tco_customers ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) UNIQUE;
ALTER TABLE tco_customers ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'trial';
ALTER TABLE tco_customers ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP;
ALTER TABLE tco_customers ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP;
ALTER TABLE tco_customers ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP DEFAULT (NOW() + INTERVAL '14 days');

-- Index for Stripe customer ID
CREATE INDEX IF NOT EXISTS idx_tco_customers_stripe ON tco_customers(stripe_customer_id);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'TCO Leads table and Stripe fields added successfully!';
  RAISE NOTICE 'New table: tco_leads';
  RAISE NOTICE 'Updated table: tco_customers (added Stripe fields)';
  RAISE NOTICE 'Ready to capture leads from cost analyzer!';
END $$;
