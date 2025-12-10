```sql
CREATE TABLE energy_devices (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    type VARCHAR(100),
    capacity FLOAT,
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE energy_transactions (
    id SERIAL PRIMARY KEY,
    device_id INTEGER REFERENCES energy_devices(id),
    energy_consumed FLOAT,
    energy_produced FLOAT,
    price FLOAT,
    transaction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pricing_models (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(255),
    model_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE energy_incentives (
    id SERIAL PRIMARY KEY,
    incentive_name VARCHAR(255),
    description TEXT,
    reward FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE regulatory_profiles (
    id SERIAL PRIMARY KEY,
    jurisdiction VARCHAR(255),
    regulations JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);