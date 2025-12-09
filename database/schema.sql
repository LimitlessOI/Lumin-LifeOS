```sql
CREATE TABLE printers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    status VARCHAR(50),
    last_maintenance TIMESTAMP
);

CREATE TABLE print_jobs (
    id SERIAL PRIMARY KEY,
    printer_id INT REFERENCES printers(id),
    design_id INT NOT NULL,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE design_validations (
    id SERIAL PRIMARY KEY,
    design_id INT NOT NULL,
    validation_result JSONB,
    validated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE supply_chain_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50),
    details JSONB,
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```