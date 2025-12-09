```sql
-- Create table for energy transactions
CREATE TABLE energy_transactions (
    id SERIAL PRIMARY KEY,
    sender_id VARCHAR(255) NOT NULL,
    receiver_id VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for IoT sensor data
CREATE TABLE sensor_data (
    id SERIAL PRIMARY KEY,
    sensor_id VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for federated learning models
CREATE TABLE federated_models (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(255) NOT NULL,
    version INT NOT NULL,
    data JSONB NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```