```sql
CREATE TABLE IF NOT EXISTS make_scenario_logs (
  id SERIAL PRIMARY KEY,
  scenario_id VARCHAR(255) NOT NULL,
  execution_time TIMESTAMP NOT NULL DEFAULT NOW(),
  payload JSONB
);

CREATE TABLE IF NOT EXISTS connection_metrics (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  active_connections INTEGER,
  idle_connections INTEGER,
  total_connections INTEGER
);
```