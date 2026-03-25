-- TC reporting + seller update support
-- Showings, feedback, market snapshots, and generated weekly reports

CREATE TABLE IF NOT EXISTS tc_showings (
  id               BIGSERIAL PRIMARY KEY,
  transaction_id   BIGINT NOT NULL REFERENCES tc_transactions(id) ON DELETE CASCADE,
  showing_at       TIMESTAMPTZ NOT NULL,
  status           TEXT NOT NULL DEFAULT 'scheduled'
                   CHECK (status IN ('scheduled','completed','cancelled','no_show')),
  showing_agent_name  TEXT,
  showing_agent_email TEXT,
  showing_agent_phone TEXT,
  source           TEXT NOT NULL DEFAULT 'manual',
  notes            TEXT,
  metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tc_showing_feedback (
  id               BIGSERIAL PRIMARY KEY,
  showing_id       BIGINT NOT NULL REFERENCES tc_showings(id) ON DELETE CASCADE,
  transaction_id   BIGINT NOT NULL REFERENCES tc_transactions(id) ON DELETE CASCADE,
  sentiment        TEXT CHECK (sentiment IN ('positive','neutral','negative','mixed')),
  rating           INTEGER CHECK (rating BETWEEN 1 AND 5),
  price_feedback   TEXT,
  condition_feedback TEXT,
  competition_feedback TEXT,
  raw_feedback     TEXT NOT NULL,
  source           TEXT NOT NULL DEFAULT 'manual',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tc_market_snapshots (
  id               BIGSERIAL PRIMARY KEY,
  transaction_id   BIGINT NOT NULL REFERENCES tc_transactions(id) ON DELETE CASCADE,
  snapshot_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  active_comp_count INTEGER NOT NULL DEFAULT 0,
  pending_comp_count INTEGER NOT NULL DEFAULT 0,
  sold_comp_count   INTEGER NOT NULL DEFAULT 0,
  price_reduction_count INTEGER NOT NULL DEFAULT 0,
  avg_dom          NUMERIC(10,2),
  median_list_price NUMERIC(12,2),
  median_sold_price NUMERIC(12,2),
  view_count       INTEGER,
  save_count       INTEGER,
  inquiry_count    INTEGER,
  metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tc_weekly_reports (
  id               BIGSERIAL PRIMARY KEY,
  transaction_id   BIGINT NOT NULL REFERENCES tc_transactions(id) ON DELETE CASCADE,
  week_start       DATE NOT NULL,
  week_end         DATE NOT NULL,
  audience         TEXT NOT NULL DEFAULT 'seller'
                   CHECK (audience IN ('seller','agent','internal')),
  health_status    TEXT NOT NULL CHECK (health_status IN ('healthy','watch','at_risk')),
  summary          TEXT NOT NULL,
  recommendations  JSONB NOT NULL DEFAULT '[]'::jsonb,
  metrics          JSONB NOT NULL DEFAULT '{}'::jsonb,
  report_payload   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tc_showings_tx            ON tc_showings (transaction_id, showing_at DESC);
CREATE INDEX IF NOT EXISTS idx_tc_showing_feedback_tx    ON tc_showing_feedback (transaction_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tc_market_snapshots_tx    ON tc_market_snapshots (transaction_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_tc_weekly_reports_tx      ON tc_weekly_reports (transaction_id, week_end DESC);

DROP TRIGGER IF EXISTS trg_tc_showings_updated_at ON tc_showings;
CREATE TRIGGER trg_tc_showings_updated_at
  BEFORE UPDATE ON tc_showings
  FOR EACH ROW EXECUTE FUNCTION update_tc_updated_at();

DROP TRIGGER IF EXISTS trg_tc_showing_feedback_updated_at ON tc_showing_feedback;
CREATE TRIGGER trg_tc_showing_feedback_updated_at
  BEFORE UPDATE ON tc_showing_feedback
  FOR EACH ROW EXECUTE FUNCTION update_tc_updated_at();

DROP TRIGGER IF EXISTS trg_tc_market_snapshots_updated_at ON tc_market_snapshots;
CREATE TRIGGER trg_tc_market_snapshots_updated_at
  BEFORE UPDATE ON tc_market_snapshots
  FOR EACH ROW EXECUTE FUNCTION update_tc_updated_at();

DROP TRIGGER IF EXISTS trg_tc_weekly_reports_updated_at ON tc_weekly_reports;
CREATE TRIGGER trg_tc_weekly_reports_updated_at
  BEFORE UPDATE ON tc_weekly_reports
  FOR EACH ROW EXECUTE FUNCTION update_tc_updated_at();
