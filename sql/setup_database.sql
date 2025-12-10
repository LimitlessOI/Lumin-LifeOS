```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cognitive_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    session_data JSONB NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP
);

CREATE TABLE resilience_metrics (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    metric_data JSONB NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE team_subscriptions (
    id SERIAL PRIMARY KEY,
    team_name VARCHAR(100) NOT NULL,
    stripe_customer_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wearable_data (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    data JSONB NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_id ON cognitive_sessions(user_id);
CREATE INDEX idx_user_id ON resilience_metrics(user_id);
CREATE INDEX idx_user_id ON wearable_data(user_id);
```