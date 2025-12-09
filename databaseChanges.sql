```sql
CREATE TABLE farms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location GEOGRAPHY(Point, 4326),
    size DOUBLE PRECISION,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE drones (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER REFERENCES farms(id),
    status VARCHAR(50),
    last_maintenance DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE environment_data (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER REFERENCES farms(id),
    temperature DOUBLE PRECISION,
    humidity DOUBLE PRECISION,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE supply_chain (
    id SERIAL PRIMARY KEY,
    item_name VARCHAR(255),
    quantity INTEGER,
    status VARCHAR(50),
    farm_id INTEGER REFERENCES farms(id),
    expected_delivery DATE
);
```