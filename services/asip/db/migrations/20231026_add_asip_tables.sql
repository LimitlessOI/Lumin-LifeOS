```sql
CREATE TABLE supply_chain_assets (
    id SERIAL PRIMARY KEY,
    asset_name VARCHAR(255),
    asset_details JSONB
);

CREATE TABLE asip_sensor_readings (
    id SERIAL PRIMARY KEY,
    sensor_id VARCHAR(50),
    value NUMERIC,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE zk_proofs (
    id SERIAL PRIMARY KEY,
    proof_data BYTEA,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transparency_tiers (
    id SERIAL PRIMARY KEY,
    tier_name VARCHAR(255),
    description TEXT
);
```