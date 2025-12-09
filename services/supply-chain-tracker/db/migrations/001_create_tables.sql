```sql
CREATE TABLE supply_chain_assets (
  asset_id SERIAL PRIMARY KEY,
  asset_name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE supply_chain_events (
  event_id SERIAL PRIMARY KEY,
  asset_id INT REFERENCES supply_chain_assets(asset_id),
  event_type VARCHAR(50),
  event_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  location VARCHAR(255)
);

CREATE TABLE supply_chain_partners (
  partner_id SERIAL PRIMARY KEY,
  partner_name VARCHAR(255) NOT NULL,
  contact_info VARCHAR(255),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```