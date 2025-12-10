```sql
CREATE TABLE IF NOT EXISTS transparency_mesh_settings (
    id SERIAL PRIMARY KEY,
    setting_name VARCHAR(255) NOT NULL,
    setting_value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS supply_chain_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(255) NOT NULL,
    event_data JSONB NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS oracle_verifications (
    id SERIAL PRIMARY KEY,
    oracle_name VARCHAR(255) NOT NULL,
    verification_data JSONB NOT NULL,
    verified_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```