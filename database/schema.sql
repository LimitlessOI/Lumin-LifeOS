```sql
CREATE TABLE infrastructure_assets (
    id SERIAL PRIMARY KEY,
    asset_name VARCHAR(255) NOT NULL,
    asset_type VARCHAR(100),
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE sensor_readings (
    id SERIAL PRIMARY KEY,
    asset_id INT NOT NULL,
    sensor_type VARCHAR(100),
    reading_value FLOAT,
    reading_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_id) REFERENCES infrastructure_assets(id)
);

CREATE TABLE maintenance_predictions (
    id SERIAL PRIMARY KEY,
    asset_id INT NOT NULL,
    prediction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    predicted_issue VARCHAR(255),
    severity INT,
    FOREIGN KEY (asset_id) REFERENCES infrastructure_assets(id)
);

CREATE TABLE maintenance_logs (
    id SERIAL PRIMARY KEY,
    asset_id INT NOT NULL,
    maintenance_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    maintenance_description TEXT,
    maintenance_cost FLOAT,
    FOREIGN KEY (asset_id) REFERENCES infrastructure_assets(id)
);
```