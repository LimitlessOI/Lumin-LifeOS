-- @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
-- TC approvals + automation surface for one-click review/approve/send flows.

CREATE TABLE IF NOT EXISTS tc_approval_items (
  id                BIGSERIAL PRIMARY KEY,
  transaction_id    BIGINT NOT NULL REFERENCES tc_transactions(id) ON DELETE CASCADE,
  category          TEXT NOT NULL DEFAULT 'task'
                    CHECK (category IN ('communication','report','document','offer','task','risk')),
  title             TEXT NOT NULL,
  summary           TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','awaiting_review','approved','rejected','snoozed','completed')),
  priority          TEXT NOT NULL DEFAULT 'normal'
                    CHECK (priority IN ('low','normal','urgent','critical')),
  due_at            TIMESTAMPTZ,
  target_type       TEXT,
  target_id         BIGINT,
  prepared_action   JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  acknowledged_at   TIMESTAMPTZ,
  resolved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tc_approval_items_tx_status ON tc_approval_items (transaction_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_tc_approval_items_priority ON tc_approval_items (priority, status, due_at);

DROP TRIGGER IF EXISTS trg_tc_approval_items_updated_at ON tc_approval_items;
CREATE TRIGGER trg_tc_approval_items_updated_at
  BEFORE UPDATE ON tc_approval_items
  FOR EACH ROW EXECUTE FUNCTION update_tc_updated_at();
