```sql
CREATE TABLE energy_assets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    capacity DECIMAL,
    owner_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE energy_transactions (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES energy_assets(id),
    amount DECIMAL NOT NULL,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE optimization_schedules (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES energy_assets(id),
    schedule JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE grid_services (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE carbon_credits (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES energy_assets(id),
    credits DECIMAL,
    issued_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);