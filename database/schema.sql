```sql
CREATE TABLE microgrid_devices (
    device_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50),
    location VARCHAR(100),
    status VARCHAR(50) DEFAULT 'inactive'
);

CREATE TABLE energy_transactions (
    transaction_id SERIAL PRIMARY KEY,
    device_id INT REFERENCES microgrid_devices(device_id),
    amount DECIMAL(10, 2) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    type VARCHAR(50) NOT NULL
);

CREATE TABLE optimization_schedules (
    schedule_id SERIAL PRIMARY KEY,
    device_id INT REFERENCES microgrid_devices(device_id),
    schedule JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE resilience_subscriptions (
    subscription_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    tier VARCHAR(50) NOT NULL,
    start_date DATE,
    end_date DATE
);
```