-- ╔══════════════════════════════════════════════════════════════════════════════════╗
-- ║              COMPLETE AI USAGE TRACKING (Creates Everything)                    ║
-- ║              Creates ai_usage table + enhanced tracking                         ║
-- ╚══════════════════════════════════════════════════════════════════════════════════╝

-- Create ai_usage table (base table)
CREATE TABLE IF NOT EXISTS ai_usage (
  id SERIAL PRIMARY KEY,
  customer_id VARCHAR(200),
  model VARCHAR(100) NOT NULL,
  tokens INTEGER NOT NULL,
  cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  capability VARCHAR(200),
  prompt_length INTEGER,
  response_length INTEGER,
  response_time INTEGER,
  tier INTEGER DEFAULT 0,
  success BOOLEAN DEFAULT true,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for ai_usage
CREATE INDEX IF NOT EXISTS idx_ai_usage_customer_date ON ai_usage(customer_id, date);
CREATE INDEX IF NOT EXISTS idx_ai_usage_capability ON ai_usage(capability);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_tier ON ai_usage(tier);
CREATE INDEX IF NOT EXISTS idx_ai_usage_success ON ai_usage(success);
CREATE INDEX IF NOT EXISTS idx_ai_usage_model ON ai_usage(model);

-- Budget alerts table
CREATE TABLE IF NOT EXISTS ai_budget_alerts (
  id SERIAL PRIMARY KEY,
  alert_type VARCHAR(50) NOT NULL,
  alert_data JSONB,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by VARCHAR(200),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_alerts_type ON ai_budget_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_created ON ai_budget_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_ack ON ai_budget_alerts(acknowledged);

-- Budget limits table
CREATE TABLE IF NOT EXISTS ai_budget_limits (
  id SERIAL PRIMARY KEY,
  customer_id VARCHAR(200),
  tier VARCHAR(50) NOT NULL,
  daily_calls INTEGER NOT NULL,
  daily_cost DECIMAL(10, 2) NOT NULL,
  monthly_cost DECIMAL(10, 2) NOT NULL,
  alert_threshold DECIMAL(3, 2) DEFAULT 0.80,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, tier)
);

CREATE INDEX IF NOT EXISTS idx_budget_limits_customer ON ai_budget_limits(customer_id);
CREATE INDEX IF NOT EXISTS idx_budget_limits_tier ON ai_budget_limits(tier);

-- Insert default budget limits
INSERT INTO ai_budget_limits (customer_id, tier, daily_calls, daily_cost, monthly_cost)
VALUES
  (NULL, 'free_tier', 1000, 0, 0),
  (NULL, 'basic', 10000, 50, 1000),
  (NULL, 'pro', 100000, 500, 10000),
  (NULL, 'enterprise', 1000000, 5000, 100000),
  ('INTERNAL', 'internal', 1000000, 10, 200)
ON CONFLICT (customer_id, tier) DO NOTHING;

-- Cost anomalies table
CREATE TABLE IF NOT EXISTS ai_cost_anomalies (
  id SERIAL PRIMARY KEY,
  customer_id VARCHAR(200) NOT NULL,
  capability VARCHAR(200),
  model VARCHAR(100) NOT NULL,
  cost DECIMAL(10, 6) NOT NULL,
  tokens INTEGER NOT NULL,
  threshold DECIMAL(10, 2) DEFAULT 5.00,
  investigated BOOLEAN DEFAULT FALSE,
  investigation_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anomalies_customer ON ai_cost_anomalies(customer_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_created ON ai_cost_anomalies(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_cost ON ai_cost_anomalies(cost DESC);

-- ROI tracking table
CREATE TABLE IF NOT EXISTS ai_capability_roi (
  id SERIAL PRIMARY KEY,
  capability VARCHAR(200) NOT NULL,
  metric_type VARCHAR(100) NOT NULL,
  metric_value DECIMAL(10, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roi_capability ON ai_capability_roi(capability);
CREATE INDEX IF NOT EXISTS idx_roi_metric ON ai_capability_roi(metric_type);
CREATE INDEX IF NOT EXISTS idx_roi_created ON ai_capability_roi(created_at DESC);

-- Materialized view: Cost by capability
DROP MATERIALIZED VIEW IF EXISTS ai_cost_by_capability CASCADE;
CREATE MATERIALIZED VIEW ai_cost_by_capability AS
SELECT
  capability,
  DATE_TRUNC('day', created_at) as day,
  COUNT(*) as calls,
  COALESCE(SUM(cost), 0) as total_cost,
  COALESCE(AVG(cost), 0) as avg_cost,
  COALESCE(SUM(tokens), 0) as total_tokens,
  COALESCE(AVG(response_time), 0) as avg_response_time
FROM ai_usage
WHERE capability IS NOT NULL
GROUP BY capability, DATE_TRUNC('day', created_at);

CREATE INDEX idx_cost_by_cap_day ON ai_cost_by_capability(day DESC);
CREATE INDEX idx_cost_by_cap_cost ON ai_cost_by_capability(total_cost DESC);

-- Materialized view: Cost by model
DROP MATERIALIZED VIEW IF EXISTS ai_cost_by_model CASCADE;
CREATE MATERIALIZED VIEW ai_cost_by_model AS
SELECT
  model,
  DATE_TRUNC('day', created_at) as day,
  COUNT(*) as calls,
  COALESCE(SUM(cost), 0) as total_cost,
  COALESCE(AVG(cost), 0) as avg_cost,
  COALESCE(SUM(tokens), 0) as total_tokens
FROM ai_usage
GROUP BY model, DATE_TRUNC('day', created_at);

CREATE INDEX idx_cost_by_model_day ON ai_cost_by_model(day DESC);
CREATE INDEX idx_cost_by_model_cost ON ai_cost_by_model(total_cost DESC);

-- Materialized view: Daily summary
DROP MATERIALIZED VIEW IF EXISTS ai_daily_cost_summary CASCADE;
CREATE MATERIALIZED VIEW ai_daily_cost_summary AS
SELECT
  date,
  COUNT(*) as total_calls,
  COALESCE(SUM(cost), 0) as total_cost,
  COUNT(DISTINCT customer_id) as unique_customers,
  COUNT(DISTINCT capability) as capabilities_used,
  COALESCE(AVG(cost), 0) as avg_cost_per_call
FROM ai_usage
GROUP BY date
ORDER BY date DESC;

CREATE INDEX idx_daily_summary_date ON ai_daily_cost_summary(date DESC);

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_ai_cost_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY ai_cost_by_capability;
  REFRESH MATERIALIZED VIEW CONCURRENTLY ai_cost_by_model;
  REFRESH MATERIALIZED VIEW CONCURRENTLY ai_daily_cost_summary;
END;
$$ LANGUAGE plpgsql;

-- Trigger function: Detect cost anomalies
CREATE OR REPLACE FUNCTION detect_cost_anomaly()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cost > 5.00 THEN
    INSERT INTO ai_cost_anomalies
      (customer_id, capability, model, cost, tokens, created_at)
    VALUES
      (NEW.customer_id, NEW.capability, NEW.model, NEW.cost, NEW.tokens, NEW.created_at);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-detect anomalies
DROP TRIGGER IF EXISTS ai_usage_anomaly_detector ON ai_usage;
CREATE TRIGGER ai_usage_anomaly_detector
  AFTER INSERT ON ai_usage
  FOR EACH ROW
  EXECUTE FUNCTION detect_cost_anomaly();

-- View: ROI by capability
CREATE OR REPLACE VIEW ai_roi_by_capability AS
SELECT
  r.capability,
  COALESCE(SUM(CASE WHEN r.metric_type = 'cost_saved' THEN r.metric_value ELSE 0 END), 0) as total_cost_saved,
  COALESCE(SUM(CASE WHEN r.metric_type = 'revenue_generated' THEN r.metric_value ELSE 0 END), 0) as total_revenue,
  COALESCE(SUM(CASE WHEN r.metric_type = 'bugs_prevented' THEN r.metric_value ELSE 0 END), 0) as bugs_prevented,
  COALESCE(SUM(CASE WHEN r.metric_type = 'time_saved' THEN r.metric_value ELSE 0 END), 0) as hours_saved,
  COALESCE(u.total_cost, 0) as ai_cost,
  CASE
    WHEN COALESCE(u.total_cost, 0) > 0
    THEN (
      COALESCE(SUM(CASE WHEN r.metric_type IN ('cost_saved', 'revenue_generated') THEN r.metric_value ELSE 0 END), 0) /
      COALESCE(u.total_cost, 1)
    )
    ELSE 0
  END as roi_multiple
FROM ai_capability_roi r
LEFT JOIN (
  SELECT capability, SUM(cost) as total_cost
  FROM ai_usage
  GROUP BY capability
) u ON r.capability = u.capability
GROUP BY r.capability, u.total_cost;

-- Success message
SELECT '✅ Complete AI usage tracking setup complete!' as status,
       (SELECT COUNT(*) FROM ai_budget_limits) as budget_limits_created;
