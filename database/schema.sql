```sql
CREATE TABLE stripe_clients (
    id SERIAL PRIMARY KEY,
    client_id VARCHAR(255) UNIQUE NOT NULL,
    secret_key VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stripe_metrics (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES stripe_clients(id),
    metric_name VARCHAR(255) NOT NULL,
    metric_value DOUBLE PRECISION,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE optimization_recommendations (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES stripe_clients(id),
    recommendation TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stripe_alerts (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES stripe_clients(id),
    alert_message TEXT NOT NULL,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```