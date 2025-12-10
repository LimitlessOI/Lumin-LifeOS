```sql
-- Create market_reports table
CREATE TABLE market_reports (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  report_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create market_alerts table
CREATE TABLE market_alerts (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  alert_message TEXT NOT NULL,
  alert_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create user_dashboards table
CREATE TABLE user_dashboards (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  dashboard_config JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```