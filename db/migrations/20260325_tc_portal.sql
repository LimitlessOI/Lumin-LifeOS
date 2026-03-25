-- TC portal + communication layer
-- Adds document requests and communication tracking for agent/client portal views

CREATE TABLE IF NOT EXISTS tc_document_requests (
  id              BIGSERIAL PRIMARY KEY,
  transaction_id  BIGINT NOT NULL REFERENCES tc_transactions(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  requested_from  TEXT NOT NULL DEFAULT 'client',
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','sent','received','cancelled','resolved')),
  due_at          TIMESTAMPTZ,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tc_communications (
  id              BIGSERIAL PRIMARY KEY,
  transaction_id  BIGINT NOT NULL REFERENCES tc_transactions(id) ON DELETE CASCADE,
  channel         TEXT NOT NULL DEFAULT 'email'
                  CHECK (channel IN ('email','sms','portal','call','internal_note')),
  audience        TEXT NOT NULL DEFAULT 'client'
                  CHECK (audience IN ('client','agent','internal','title','lender','other')),
  template_key    TEXT,
  subject         TEXT,
  body            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','prepared','sent','failed','acknowledged','cancelled')),
  sent_at         TIMESTAMPTZ,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tc_doc_requests_tx ON tc_document_requests (transaction_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tc_doc_requests_due ON tc_document_requests (status, due_at) WHERE status IN ('pending','sent');
CREATE INDEX IF NOT EXISTS idx_tc_comms_tx ON tc_communications (transaction_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tc_comms_audience ON tc_communications (audience, status, created_at DESC);

DROP TRIGGER IF EXISTS trg_tc_doc_requests_updated_at ON tc_document_requests;
CREATE TRIGGER trg_tc_doc_requests_updated_at
  BEFORE UPDATE ON tc_document_requests
  FOR EACH ROW EXECUTE FUNCTION update_tc_updated_at();

DROP TRIGGER IF EXISTS trg_tc_comms_updated_at ON tc_communications;
CREATE TRIGGER trg_tc_comms_updated_at
  BEFORE UPDATE ON tc_communications
  FOR EACH ROW EXECUTE FUNCTION update_tc_updated_at();
