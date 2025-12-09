```sql
CREATE TABLE reusable_assets (
    asset_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE circular_transactions (
    transaction_id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES reusable_assets(asset_id),
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(10, 2)
);

CREATE TABLE drone_fleet (
    drone_id SERIAL PRIMARY KEY,
    model VARCHAR(255),
    status VARCHAR(50),
    operator VARCHAR(255),
    last_maintenance TIMESTAMP
);

CREATE TABLE pricing_models (
    model_id SERIAL PRIMARY KEY,
    description TEXT,
    base_price DECIMAL(10, 2),
    dynamic_factor DECIMAL(5, 2)
);
```