```sql
CREATE TABLE customer_interactions (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    message TEXT NOT NULL,
    sentiment TEXT,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer_profiles (
    id SERIAL PRIMARY KEY,
    customer_id INT UNIQUE NOT NULL,
    preferences JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE handoff_logs (
    id SERIAL PRIMARY KEY,
    interaction_id INT NOT NULL REFERENCES customer_interactions(id),
    handoff_reason TEXT,
    handed_off_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```