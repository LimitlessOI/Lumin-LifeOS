```sql
-- Create table for assets involved in predictive maintenance
CREATE TABLE predictive_maintenance_assets (
    id SERIAL PRIMARY KEY,
    asset_name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    asset_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for sensor readings
CREATE TABLE sensor_readings (
    id SERIAL PRIMARY KEY,
    asset_id INT NOT NULL,
    reading_type VARCHAR(100),
    reading_value FLOAT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_id) REFERENCES predictive_maintenance_assets(id)
);

-- Create table for maintenance alerts
CREATE TABLE maintenance_alerts (
    id SERIAL PRIMARY KEY,
    asset_id INT NOT NULL,
    alert_message TEXT,
    severity INT,
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_id) REFERENCES predictive_maintenance_assets(id)
);

-- Create table for federated learning models
CREATE TABLE federated_learning_models (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(255),
    model_version VARCHAR(50),
    model_data BYTEA,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for maintenance records
CREATE TABLE maintenance_records (
    id SERIAL PRIMARY KEY,
    asset_id INT NOT NULL,
    maintenance_description TEXT,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    technician_feedback TEXT,
    FOREIGN KEY (asset_id) REFERENCES predictive_maintenance_assets(id)
);