-- Creating table for energy assets
CREATE TABLE energy_assets (
    asset_id SERIAL PRIMARY KEY,
    asset_name VARCHAR(255) NOT NULL,
    owner_id INT NOT NULL,
    asset_type VARCHAR(50),
    capacity DECIMAL(10, 2),
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Creating table for energy transactions
CREATE TABLE energy_transactions (
    transaction_id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES energy_assets(asset_id),
    buyer_id INT NOT NULL,
    seller_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending'
);

-- Creating table for IoT sensor data
CREATE TABLE iot_sensor_data (
    sensor_id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES energy_assets(asset_id),
    data JSONB,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Creating table for pricing models
CREATE TABLE pricing_models (
    model_id SERIAL PRIMARY KEY,
    model_name VARCHAR(255) NOT NULL,
    algorithm VARCHAR(255),
    parameters JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Creating table for energy tokens
CREATE TABLE energy_tokens (
    token_id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES energy_assets(asset_id),
    owner_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);