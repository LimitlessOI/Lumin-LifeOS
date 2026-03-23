-- TC Fee Tracking
-- Adds fee columns to tc_transactions (setup fee + closing fee)
-- Fees are collected at closing — tracked here so nothing falls through

ALTER TABLE tc_transactions
  ADD COLUMN IF NOT EXISTS setup_fee         NUMERIC(8,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS setup_fee_waived  BOOLEAN       DEFAULT false,
  ADD COLUMN IF NOT EXISTS closing_fee       NUMERIC(8,2)  DEFAULT 200,
  ADD COLUMN IF NOT EXISTS closing_fee_note  TEXT,         -- e.g. "reduced per agreement"
  ADD COLUMN IF NOT EXISTS fee_collected     BOOLEAN       DEFAULT false,
  ADD COLUMN IF NOT EXISTS fee_collected_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fee_collected_amt NUMERIC(8,2), -- actual amount received at closing
  ADD COLUMN IF NOT EXISTS client_name       TEXT,         -- who we are doing TC work for
  ADD COLUMN IF NOT EXISTS client_email      TEXT,
  ADD COLUMN IF NOT EXISTS client_phone      TEXT;

-- Default pricing config table — one row, updated via API
CREATE TABLE IF NOT EXISTS tc_pricing_config (
  id                   INT  PRIMARY KEY DEFAULT 1,
  default_setup_fee    NUMERIC(8,2)  NOT NULL DEFAULT 199,
  default_closing_fee  NUMERIC(8,2)  NOT NULL DEFAULT 200,
  waive_setup_allowed  BOOLEAN       NOT NULL DEFAULT true,
  min_closing_fee      NUMERIC(8,2)  NOT NULL DEFAULT 99,
  notes                TEXT,
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CHECK (id = 1)  -- singleton
);

-- Insert default config if not exists
INSERT INTO tc_pricing_config (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_tc_fee_uncollected
  ON tc_transactions (status, fee_collected)
  WHERE fee_collected = false AND status = 'closed';
