```sql
-- Table for storing predictive maintenance assets
CREATE TABLE predictive_maintenance_assets (
    asset_id SERIAL PRIMARY KEY,
    asset_name VARCHAR(255) NOT NULL,
    asset_type VARCHAR(100),
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing sensor readings from assets
CREATE TABLE sensor_readings (
    reading_id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES predictive_maintenance_assets(asset_id),
    sensor_type VARCHAR(100),
    reading_value DOUBLE PRECISION,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing maintenance predictions
CREATE TABLE maintenance_predictions (
    prediction_id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES predictive_maintenance_assets(asset_id),
    prediction_date TIMESTAMP,
    predicted_issue VARCHAR(255),
    confidence_level DOUBLE PRECISION,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing actual maintenance events
CREATE TABLE maintenance_events (
    event_id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES predictive_maintenance_assets(asset_id),
    event_date TIMESTAMP,
    issue_resolved VARCHAR(255),
    resolution_details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for federated learning model management
CREATE TABLE federated_learning_models (
    model_id SERIAL PRIMARY KEY,
    model_name VARCHAR(255),
    version VARCHAR(50),
    model_data BYTEA,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing ROI calculations
CREATE TABLE roi_calculations (
    calculation_id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES predictive_maintenance_assets(asset_id),
    calculation_date TIMESTAMP,
    cost_saved DOUBLE PRECISION,
    revenue_generated DOUBLE PRECISION,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);