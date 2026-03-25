-- @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
-- TC closed-loop alerting and escalation state.

CREATE TABLE IF NOT EXISTS tc_alerts (
  id                BIGSERIAL PRIMARY KEY,
  transaction_id    BIGINT NOT NULL REFERENCES tc_transactions(id) ON DELETE CASCADE,
  severity          TEXT NOT NULL DEFAULT 'action_required'
                    CHECK (severity IN ('info','action_required','urgent','critical')),
  title             TEXT NOT NULL,
  summary           TEXT,
  status            TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','acknowledged','snoozed','resolved')),
  assigned_to       TEXT,
  target_type       TEXT,
  target_id         BIGINT,
  escalation_step   INTEGER NOT NULL DEFAULT 0,
  next_escalation_at TIMESTAMPTZ,
  prepared_action   JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  acknowledged_at   TIMESTAMPTZ,
  resolved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tc_alert_deliveries (
  id                BIGSERIAL PRIMARY KEY,
  alert_id          BIGINT NOT NULL REFERENCES tc_alerts(id) ON DELETE CASCADE,
  channel           TEXT NOT NULL,
  status            TEXT NOT NULL,
  payload           JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tc_alerts_tx_status ON tc_alerts (transaction_id, status, severity, next_escalation_at);
CREATE INDEX IF NOT EXISTS idx_tc_alert_deliveries_alert ON tc_alert_deliveries (alert_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_tc_alerts_updated_at ON tc_alerts;
CREATE TRIGGER trg_tc_alerts_updated_at
  BEFORE UPDATE ON tc_alerts
  FOR EACH ROW EXECUTE FUNCTION update_tc_updated_at();
