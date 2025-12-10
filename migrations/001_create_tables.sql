```sql
CREATE TABLE financial_optimization_runs (
  id SERIAL PRIMARY KEY,
  parameters JSONB NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE anomaly_detection_events (
  id SERIAL PRIMARY KEY,
  event_data JSONB NOT NULL,
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ethical_boundary_rules (
  id SERIAL PRIMARY KEY,
  rule_definition TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE
);
```