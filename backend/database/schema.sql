```sql
CREATE TABLE ecommerce_funnels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE funnel_sessions (
    id SERIAL PRIMARY KEY,
    funnel_id INT REFERENCES ecommerce_funnels(id),
    session_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_recommendations (
    id SERIAL PRIMARY KEY,
    session_id INT REFERENCES funnel_sessions(id),
    recommendation TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pricing_events (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL,
    old_price DECIMAL(10, 2),
    new_price DECIMAL(10, 2),
    event_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```