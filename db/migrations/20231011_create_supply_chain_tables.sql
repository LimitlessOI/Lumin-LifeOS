```sql
CREATE TABLE supply_chain_events (
    id SERIAL PRIMARY KEY,
    event_data JSONB NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transparency_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(255) NOT NULL,
    setting_value VARCHAR(255) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE supplier_incentives (
    id SERIAL PRIMARY KEY,
    supplier_id INT NOT NULL,
    incentive_amount NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE iot_oracle_feeds (
    id SERIAL PRIMARY KEY,
    feed_data JSONB NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```