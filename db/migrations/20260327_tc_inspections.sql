-- TC Inspection workflow: scheduling, report receipt, and buyer decision
-- Decision options: accept_as_is | repair_request | reject_and_cancel
--
-- Rejection is time-critical in Nevada — buyer must notify within the
-- inspection contingency window (default 10 days from acceptance) to
-- preserve earnest money. System fires an urgent alert immediately on
-- reject decision and drafts the cancellation notice automatically.
--
-- @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md

CREATE TABLE IF NOT EXISTS tc_inspections (
  id                        BIGSERIAL PRIMARY KEY,
  transaction_id            BIGINT NOT NULL REFERENCES tc_transactions(id) ON DELETE CASCADE,

  -- Inspector info
  inspector_name            TEXT,
  inspector_company         TEXT,
  inspector_phone           TEXT,
  inspector_email           TEXT,

  -- Scheduling
  scheduled_at              TIMESTAMPTZ,
  completed_at              TIMESTAMPTZ,

  -- Report
  report_received_at        TIMESTAMPTZ,
  report_url                TEXT,
  findings_summary          TEXT,       -- free-text or AI-extracted summary
  findings_items            JSONB DEFAULT '[]'::jsonb,
  -- [{ category: 'roof', severity: 'major|minor|cosmetic', description: '...' }]

  -- Buyer decision
  decision                  TEXT CHECK (decision IN ('accept_as_is', 'repair_request', 'reject_and_cancel')),
  decision_made_at          TIMESTAMPTZ,
  decision_notes            TEXT,

  -- Repair request specifics (if decision = repair_request)
  repair_request_items      JSONB DEFAULT '[]'::jsonb,
  -- [{ item: '...', amount_requested: 12500, type: 'credit|repair' }]
  repair_response_deadline  DATE,       -- deadline for seller to respond to repair request
  repair_response           TEXT CHECK (repair_response IN ('accepted', 'counter', 'rejected', 'pending')),
  repair_response_at        TIMESTAMPTZ,
  repair_counter_offer      JSONB,      -- seller counter terms

  -- Rejection tracking (if decision = reject_and_cancel)
  cancellation_notice_text  TEXT,       -- AI-drafted cancellation notice
  cancellation_notice_sent_at TIMESTAMPTZ,
  earnest_money_return_requested_at TIMESTAMPTZ,
  contingency_days_remaining NUMERIC(5,1),  -- days left when rejection decision was made

  -- Alert state
  urgent_alert_fired_at     TIMESTAMPTZ,  -- when the agent was alerted of rejection
  agent_acknowledged_at     TIMESTAMPTZ,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tc_inspections_transaction ON tc_inspections(transaction_id);
CREATE INDEX IF NOT EXISTS idx_tc_inspections_decision    ON tc_inspections(decision);
CREATE INDEX IF NOT EXISTS idx_tc_inspections_scheduled   ON tc_inspections(scheduled_at);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_tc_inspection_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_tc_inspection_updated_at ON tc_inspections;
CREATE TRIGGER trg_tc_inspection_updated_at
  BEFORE UPDATE ON tc_inspections
  FOR EACH ROW EXECUTE FUNCTION update_tc_inspection_updated_at();
