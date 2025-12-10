```sql
CREATE TABLE supply_chain_products (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE iot_sensor_data (
    data_id SERIAL PRIMARY KEY,
    product_id INT REFERENCES supply_chain_products(product_id),
    sensor_type VARCHAR(100),
    value NUMERIC,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE anomaly_detection_logs (
    log_id SERIAL PRIMARY KEY,
    data_id INT REFERENCES iot_sensor_data(data_id),
    anomaly_type VARCHAR(100),
    details TEXT,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ethical_scores (
    score_id SERIAL PRIMARY KEY,
    product_id INT REFERENCES supply_chain_products(product_id),
    score NUMERIC,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```