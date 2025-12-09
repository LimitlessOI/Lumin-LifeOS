```sql
CREATE TABLE IF NOT EXISTS infrastructures (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    last_inspection TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sensor_data (
    id SERIAL PRIMARY KEY,
    infrastructure_id INT REFERENCES infrastructures(id),
    sensor_type VARCHAR(50) NOT NULL,
    value FLOAT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS repairs (
    id SERIAL PRIMARY KEY,
    infrastructure_id INT REFERENCES infrastructures(id),
    repair_type VARCHAR(50) NOT NULL,
    cost FLOAT NOT NULL,
    repair_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```