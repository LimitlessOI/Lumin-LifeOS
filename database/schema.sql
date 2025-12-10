```sql
CREATE TABLE ai_models (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE model_deployments (
    id SERIAL PRIMARY KEY,
    model_id INTEGER REFERENCES ai_models(id),
    deployment_status VARCHAR(50),
    deployed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE model_transactions (
    id SERIAL PRIMARY KEY,
    model_id INTEGER REFERENCES ai_models(id),
    transaction_type VARCHAR(50),
    amount DECIMAL(10, 2),
    currency VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE model_reputation (
    model_id INTEGER PRIMARY KEY REFERENCES ai_models(id),
    reputation_score DECIMAL(5, 2),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);