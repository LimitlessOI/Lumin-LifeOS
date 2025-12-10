```sql
CREATE TABLE biodegradable_devices (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    manufacturer_id INT,
    decomposition_tier_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE decomposition_tiers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    duration_days INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE manufacturer_partners (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_info TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sensor_readings (
    id SERIAL PRIMARY KEY,
    device_id INT NOT NULL,
    reading JSONB NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES biodegradable_devices(id)
);
```