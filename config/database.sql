```sql
-- PostgreSQL schema setup for 'circular_resources', 'marketplace_listings', and 'environmental_impact'

CREATE TABLE circular_resources (
    id SERIAL PRIMARY KEY,
    resource_name VARCHAR(100),
    quantity INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE marketplace_listings (
    id SERIAL PRIMARY KEY,
    item_name VARCHAR(100),
    price DECIMAL(10, 2),
    available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE environmental_impact (
    id SERIAL PRIMARY KEY,
    resource_id INT REFERENCES circular_resources(id),
    impact_score DECIMAL(5, 2),
    measured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```