```sql
CREATE TABLE biodegradable_components (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    manufacturer_id INT,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE decomposition_events (
    id SERIAL PRIMARY KEY,
    component_id INT REFERENCES biodegradable_components(id),
    event_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    environmental_conditions JSONB
);

CREATE TABLE manufacturer_integrations (
    id SERIAL PRIMARY KEY,
    manufacturer_name VARCHAR(255) NOT NULL,
    api_key VARCHAR(255) NOT NULL,
    integration_status VARCHAR(50) DEFAULT 'pending'
);
```