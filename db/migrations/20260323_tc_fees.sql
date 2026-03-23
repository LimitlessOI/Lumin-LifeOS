-- TC Fee Tracking + Agent Client Registry
-- Three billing models: founding_member, monthly, per_transaction

-- ── Agent client registry ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tc_agent_clients (
  id                SERIAL PRIMARY KEY,
  name              TEXT        NOT NULL,
  email             TEXT        NOT NULL UNIQUE,
  phone             TEXT,

  -- Billing plan
  plan              TEXT        NOT NULL DEFAULT 'monthly',
  -- founding_member: $500 setup + $50/mo locked forever (beta only)
  -- monthly:         $149/mo, no setup
  -- per_transaction: $349/closed deal from escrow, no monthly, no charge if deal falls

  setup_fee         NUMERIC(8,2) NOT NULL DEFAULT 0,
  setup_fee_waived  BOOLEAN      NOT NULL DEFAULT false,
  setup_paid        BOOLEAN      NOT NULL DEFAULT false,
  setup_paid_at     TIMESTAMPTZ,
  setup_paid_amt    NUMERIC(8,2),

  monthly_fee       NUMERIC(8,2) NOT NULL DEFAULT 0,
  -- 0 for per_transaction plan

  active            BOOLEAN      NOT NULL DEFAULT true,
  notes             TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tc_clients_plan   ON tc_agent_clients (plan);
CREATE INDEX IF NOT EXISTS idx_tc_clients_active ON tc_agent_clients (active) WHERE active = true;

-- ── Fee columns on tc_transactions ────────────────────────────────────────
ALTER TABLE tc_transactions
  ADD COLUMN IF NOT EXISTS setup_fee         NUMERIC(8,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS setup_fee_waived  BOOLEAN       DEFAULT false,
  ADD COLUMN IF NOT EXISTS closing_fee       NUMERIC(8,2)  DEFAULT 200,
  ADD COLUMN IF NOT EXISTS closing_fee_note  TEXT,
  ADD COLUMN IF NOT EXISTS fee_collected     BOOLEAN       DEFAULT false,
  ADD COLUMN IF NOT EXISTS fee_collected_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fee_collected_amt NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS client_name       TEXT,
  ADD COLUMN IF NOT EXISTS client_email      TEXT,
  ADD COLUMN IF NOT EXISTS client_phone      TEXT;

-- ── Default pricing config (singleton) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS tc_pricing_config (
  id                    INT  PRIMARY KEY DEFAULT 1,
  founding_setup_fee    NUMERIC(8,2) NOT NULL DEFAULT 500,
  founding_monthly_fee  NUMERIC(8,2) NOT NULL DEFAULT 249,
  monthly_fee           NUMERIC(8,2) NOT NULL DEFAULT 149,
  per_tx_fee            NUMERIC(8,2) NOT NULL DEFAULT 349,
  beta_open             BOOLEAN      NOT NULL DEFAULT true,  -- false = founding plan no longer offered
  notes                 TEXT,
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CHECK (id = 1)
);

INSERT INTO tc_pricing_config (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Outstanding fee index
CREATE INDEX IF NOT EXISTS idx_tc_fee_uncollected
  ON tc_transactions (status, fee_collected)
  WHERE fee_collected = false AND status = 'closed';
