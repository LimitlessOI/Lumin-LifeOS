```sql
CREATE TABLE inspections (
    id SERIAL PRIMARY KEY,
    inspection_date TIMESTAMP NOT NULL,
    location VARCHAR(255),
    status VARCHAR(50),
    drone_id INT REFERENCES drone_fleet(id)
);

CREATE TABLE drone_fleet (
    id SERIAL PRIMARY KEY,
    model VARCHAR(100),
    status VARCHAR(50),
    last_maintenance TIMESTAMP
);

CREATE TABLE inspection_findings (
    id SERIAL PRIMARY KEY,
    inspection_id INT REFERENCES inspections(id),
    finding TEXT,
    severity VARCHAR(50)
);

CREATE TABLE charging_stations (
    id SERIAL PRIMARY KEY,
    location VARCHAR(255),
    capacity INT,
    available BOOLEAN
);
```