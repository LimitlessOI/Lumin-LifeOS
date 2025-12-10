```sql
-- Table for storing Stripe consultancy users
CREATE TABLE stripe_consultancy_users (
  user_id SERIAL PRIMARY KEY,
  stripe_customer_id VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for client optimization reports
CREATE TABLE client_optimization_reports (
  report_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  report_data JSONB,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES stripe_consultancy_users(user_id)
);

-- Table for Stripe metric snapshots
CREATE TABLE stripe_metric_snapshots (
  snapshot_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  metrics JSONB,
  snapshot_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES stripe_consultancy_users(user_id)
);
```