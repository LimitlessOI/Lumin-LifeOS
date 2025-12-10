CREATE TABLE traffic_data (
    id SERIAL PRIMARY KEY,
    sensor_id VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    vehicle_count INTEGER NOT NULL,
    avg_speed FLOAT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    predicted_congestion FLOAT
);