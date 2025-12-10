```sql
CREATE TABLE crisis_resources (
    id SERIAL PRIMARY KEY,
    resource_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    location VARCHAR(255) NOT NULL
);

CREATE TABLE resource_predictions (
    id SERIAL PRIMARY KEY,
    resource_id INT REFERENCES crisis_resources(id),
    predicted_shortage BOOLEAN,
    prediction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE resource_transfers (
    id SERIAL PRIMARY KEY,
    from_location VARCHAR(255) NOT NULL,
    to_location VARCHAR(255) NOT NULL,
    resource_id INT REFERENCES crisis_resources(id),
    quantity INT NOT NULL,
    transfer_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_trails (
    id SERIAL PRIMARY KEY,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```