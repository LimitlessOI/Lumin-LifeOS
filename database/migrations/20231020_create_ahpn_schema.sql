CREATE TABLE vehicles (
    id SERIAL PRIMARY KEY,
    vin VARCHAR(17) UNIQUE NOT NULL,
    model VARCHAR(50),
    manufacturer VARCHAR(50),
    year INT
);

CREATE TABLE platoons (
    id SERIAL PRIMARY KEY,
    leader_vehicle_id INT REFERENCES vehicles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE routes (
    id SERIAL PRIMARY KEY,
    start_point GEOGRAPHY(POINT, 4326),
    end_point GEOGRAPHY(POINT, 4326),
    waypoints GEOGRAPHY(LINESTRING, 4326)
);

CREATE TABLE liability_contracts (
    id SERIAL PRIMARY KEY,
    platoon_id INT REFERENCES platoons(id),
    contract_address VARCHAR(42),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE federated_learning_models (
    id SERIAL PRIMARY KEY,
    model_data BYTEA,
    version INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);