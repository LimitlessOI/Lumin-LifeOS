```sql
CREATE TABLE equipment_metrics (
    id SERIAL PRIMARY KEY,
    equipment_id INT NOT NULL,
    metric_name VARCHAR(100),
    metric_value FLOAT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE predictive_alerts (
    alert_id SERIAL PRIMARY KEY,
    equipment_id INT NOT NULL,
    alert_type VARCHAR(100),
    alert_description TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roi_calculations (
    calculation_id SERIAL PRIMARY KEY,
    equipment_id INT NOT NULL,
    downtime_savings FLOAT,
    maintenance_cost_reduction FLOAT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE federated_learning_rounds (
    round_id SERIAL PRIMARY KEY,
    model_type VARCHAR(100),
    accuracy FLOAT,
    loss FLOAT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```