```sql
CREATE TABLE IoT_Sensors (
    sensor_id SERIAL PRIMARY KEY,
    sensor_type VARCHAR(50),
    location VARCHAR(100),
    last_data_received TIMESTAMP
);

CREATE TABLE Drones (
    drone_id SERIAL PRIMARY KEY,
    model VARCHAR(50),
    current_task VARCHAR(100),
    status VARCHAR(50)
);

CREATE TABLE AI_Models (
    model_id SERIAL PRIMARY KEY,
    model_name VARCHAR(100),
    last_trained TIMESTAMP
);

CREATE TABLE Smart_City_Data (
    data_id SERIAL PRIMARY KEY,
    source VARCHAR(100),
    data JSONB,
    timestamp TIMESTAMP
);
```