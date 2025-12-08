```sql
CREATE TABLE supply_chain_products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE supply_chain_events (
  id SERIAL PRIMARY KEY,
  product_id INT REFERENCES supply_chain_products(id),
  event_type VARCHAR(100),
  event_data JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE supplier_audits (
  id SERIAL PRIMARY KEY,
  supplier_id INT,
  audit_result JSONB,
  audit_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_sustainability_profile (
  user_id INT PRIMARY KEY,
  sustainability_score DECIMAL(5, 2),
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ar_scans (
  id SERIAL PRIMARY KEY,
  product_id INT REFERENCES supply_chain_products(id),
  scan_data JSONB,
  scan_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```