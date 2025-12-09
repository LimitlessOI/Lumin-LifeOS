```sql
CREATE TABLE health_metrics (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    metric_name VARCHAR(255) NOT NULL,
    value FLOAT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE diagnostic_results (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    result TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wearable_devices (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    device_name VARCHAR(255) NOT NULL,
    device_id VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE health_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    subscription_status VARCHAR(50) NOT NULL,
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP
);
```