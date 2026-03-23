-- Migration: Transaction Coordinator (TC) — real estate transaction tracking
-- Tracks full lifecycle from accepted contract to close of escrow (Nevada / GLVAR)

CREATE TABLE IF NOT EXISTS tc_transactions (
  id                BIGSERIAL PRIMARY KEY,
  mls_number        TEXT NOT NULL UNIQUE,
  address           TEXT NOT NULL,
  purchase_price    NUMERIC(12,2),
  status            TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','pending','closed','cancelled')),
  agent_role        TEXT NOT NULL DEFAULT 'buyers'
                    CHECK (agent_role IN ('listing','buyers','dual')),
  -- Key dates (ISO8601 strings for flexibility; acceptance is the anchor date)
  key_dates         JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- { acceptance, inspection_contingency, loan_contingency, appraisal_contingency, coe }
  close_date        DATE,
  -- All parties: buyer, seller, buyer_agent, listing_agent, escrow, lender, title
  parties           JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- TransactionDesk transaction ID (once created via browser agent)
  transaction_desk_id TEXT,
  -- Document checklist mirrored from TransactionDesk
  documents         JSONB NOT NULL DEFAULT '{"checklist":[]}'::jsonb,
  -- Freeform notes
  notes             TEXT,
  source_email_id   TEXT,  -- Message-ID of the email that triggered this transaction
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit log for every action taken on a transaction
CREATE TABLE IF NOT EXISTS tc_transaction_events (
  id              BIGSERIAL PRIMARY KEY,
  transaction_id  BIGINT NOT NULL REFERENCES tc_transactions(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL,
  -- e.g. created, party_intro_sent, deadline_reminder_sent, doc_uploaded,
  --      td_created, td_upload_failed, status_changed, manual_note
  payload         JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tc_transactions_status     ON tc_transactions (status);
CREATE INDEX IF NOT EXISTS idx_tc_transactions_close_date ON tc_transactions (close_date);
CREATE INDEX IF NOT EXISTS idx_tc_transaction_events_tx   ON tc_transaction_events (transaction_id, created_at DESC);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_tc_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_tc_updated_at ON tc_transactions;
CREATE TRIGGER trg_tc_updated_at
  BEFORE UPDATE ON tc_transactions
  FOR EACH ROW EXECUTE FUNCTION update_tc_updated_at();
