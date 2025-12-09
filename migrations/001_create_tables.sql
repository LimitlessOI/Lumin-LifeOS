```sql
CREATE TABLE IF NOT EXISTS energy_assets (
    id SERIAL PRIMARY KEY,
    asset_name VARCHAR(255) NOT NULL,
    energy_type VARCHAR(50) NOT NULL,
    capacity DECIMAL NOT NULL
);

CREATE TABLE IF NOT EXISTS microtransactions (
    id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES energy_assets(id),
    amount DECIMAL NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grid_states (
    id SERIAL PRIMARY KEY,
    state_data JSONB NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compliance_contracts (
    id SERIAL PRIMARY KEY,
    contract_address VARCHAR(255) NOT NULL,
    deployed_at TIMESTAMPTZ DEFAULT NOW()
);
```