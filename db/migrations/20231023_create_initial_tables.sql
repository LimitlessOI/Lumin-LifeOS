```sql
CREATE TABLE user_behavior_events (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    event_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dynamic_offers (
    id SERIAL PRIMARY KEY,
    offer_name VARCHAR(255) NOT NULL,
    offer_details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE offer_performance (
    id SERIAL PRIMARY KEY,
    offer_id INT REFERENCES dynamic_offers(id),
    views INT DEFAULT 0,
    conversions INT DEFAULT 0,
    revenue DECIMAL(10, 2) DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_model_versions (
    id SERIAL PRIMARY KEY,
    version_name VARCHAR(255) NOT NULL,
    model_data BYTEA,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```