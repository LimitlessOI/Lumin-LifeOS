```sql
CREATE TABLE predictive_maintenance_assets (
    asset_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE maintenance_predictions (
    prediction_id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES predictive_maintenance_assets(asset_id),
    prediction_date TIMESTAMP NOT NULL,
    prediction_result JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE maintenance_strategies (
    strategy_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parameters JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE blockchain_maintenance_records (
    record_id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES predictive_maintenance_assets(asset_id),
    transaction_hash VARCHAR(255),
    record_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```