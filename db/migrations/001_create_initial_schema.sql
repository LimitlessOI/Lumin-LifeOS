CREATE TABLE energy_assets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50),
    capacity FLOAT,
    location GEOGRAPHY(Point, 4326),
    status VARCHAR(50) DEFAULT 'inactive',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mesh_network (
    id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES energy_assets(id),
    peer_id INT,
    connection_status BOOLEAN DEFAULT FALSE,
    last_connected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE energy_transactions (
    id SERIAL PRIMARY KEY,
    from_asset_id INT REFERENCES energy_assets(id),
    to_asset_id INT REFERENCES energy_assets(id),
    amount FLOAT NOT NULL,
    transaction_time TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'pending'
);

CREATE TABLE digital_twins (
    id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES energy_assets(id),
    model_data JSONB,
    last_simulation_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE federated_learning_models (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(255) NOT NULL,
    version INT DEFAULT 1,
    model_parameters BYTEA,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
--