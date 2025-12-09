```sql
-- Supply Chain Entities Table
CREATE TABLE IF NOT EXISTS supply_chain_entities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Supply Chain Transactions Table
CREATE TABLE IF NOT EXISTS supply_chain_transactions (
    id SERIAL PRIMARY KEY,
    entity_id INT REFERENCES supply_chain_entities(id),
    transaction_date TIMESTAMP NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- IoT Sensor Data Table
CREATE TABLE IF NOT EXISTS iot_sensor_data (
    id SERIAL PRIMARY KEY,
    sensor_id VARCHAR(255) NOT NULL,
    entity_id INT REFERENCES supply_chain_entities(id),
    data JSONB,
    recorded_at TIMESTAMP NOT NULL
);

-- Compliance Metrics Table
CREATE TABLE IF NOT EXISTS compliance_metrics (
    id SERIAL PRIMARY KEY,
    entity_id INT REFERENCES supply_chain_entities(id),
    metric_name VARCHAR(255),
    value FLOAT,
    measured_at TIMESTAMP NOT NULL
);

-- Supplier Benchmarks Table
CREATE TABLE IF NOT EXISTS supplier_benchmarks (
    id SERIAL PRIMARY KEY,
    supplier_id INT REFERENCES supply_chain_entities(id),
    benchmark_name VARCHAR(255),
    benchmark_value FLOAT,
    recorded_at TIMESTAMP NOT NULL
);

-- Anomaly Alerts Table
CREATE TABLE IF NOT EXISTS anomaly_alerts (
    id SERIAL PRIMARY KEY,
    entity_id INT REFERENCES supply_chain_entities(id),
    alert_type VARCHAR(255),
    detected_at TIMESTAMP NOT NULL,
    details JSONB
);

-- Demand Forecasts Table
CREATE TABLE IF NOT EXISTS demand_forecasts (
    id SERIAL PRIMARY KEY,
    entity_id INT REFERENCES supply_chain_entities(id),
    forecast_date TIMESTAMP NOT NULL,
    forecast_value FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```