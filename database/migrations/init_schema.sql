-- Initialize 'logistics_events' table
CREATE TABLE IF NOT EXISTS logistics_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(255) NOT NULL,
    event_timestamp TIMESTAMP NOT NULL,
    details JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initialize 'inventory_predictions' table
CREATE TABLE IF NOT EXISTS inventory_predictions (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL,
    predicted_demand INT NOT NULL,
    prediction_date DATE NOT NULL,
    confidence_level FLOAT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initialize 'optimized_routes' table
CREATE TABLE IF NOT EXISTS optimized_routes (
    id SERIAL PRIMARY KEY,
    route_id VARCHAR(255) NOT NULL,
    start_location VARCHAR(255) NOT NULL,
    end_location VARCHAR(255) NOT NULL,
    distance FLOAT NOT NULL,
    estimated_time FLOAT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initialize 'supply_chain_disruptions' table
CREATE TABLE IF NOT EXISTS supply_chain_disruptions (
    id SERIAL PRIMARY KEY,
    disruption_type VARCHAR(255) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    affected_areas JSONB NOT NULL,
    reported_at TIMESTAMP NOT NULL,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);