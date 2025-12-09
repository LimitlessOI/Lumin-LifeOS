-- Table for urban synergy districts
CREATE TABLE IF NOT EXISTS urban_synergy_districts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for IoT sensor deployments
CREATE TABLE IF NOT EXISTS iot_sensor_deployments (
    id SERIAL PRIMARY KEY,
    district_id INT REFERENCES urban_synergy_districts(id),
    sensor_type VARCHAR(255),
    location GEOGRAPHY(Point, 4326),
    deployment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active'
);

-- Table for federated learning models
CREATE TABLE IF NOT EXISTS federated_learning_models (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(255),
    version VARCHAR(50),
    status VARCHAR(50) DEFAULT 'training',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for sustainability achievements
CREATE TABLE IF NOT EXISTS sustainability_achievements (
    id SERIAL PRIMARY KEY,
    district_id INT REFERENCES urban_synergy_districts(id),
    achievement_type VARCHAR(255),
    description TEXT,
    achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for citizen engagement
CREATE TABLE IF NOT EXISTS citizen_engagement (
    id SERIAL PRIMARY KEY,
    district_id INT REFERENCES urban_synergy_districts(id),
    user_id INT,
    engagement_type VARCHAR(255),
    points INT DEFAULT 0,
    engagement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for interoperability mappings
CREATE TABLE IF NOT EXISTS interoperability_mappings (
    id SERIAL PRIMARY KEY,
    source_system VARCHAR(255),
    target_system VARCHAR(255),
    mapping_details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);