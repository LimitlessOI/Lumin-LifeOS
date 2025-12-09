```sql
CREATE TABLE learning_activities (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    activity_type VARCHAR(50),
    description TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE learning_pathways (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE credentials (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    credential_data JSONB,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE marketplace_listings (
    id SERIAL PRIMARY KEY,
    tutor_id INT NOT NULL,
    service_description TEXT,
    price DECIMAL(10, 2),
    available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```