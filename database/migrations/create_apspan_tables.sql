```sql
CREATE TABLE apspan_agents (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    configuration JSONB
);

CREATE TABLE ai_modules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50),
    metadata JSONB
);

CREATE TABLE data_vaults (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES apspan_agents(id),
    data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE federated_rounds (
    id SERIAL PRIMARY KEY,
    round_number INTEGER NOT NULL,
    status VARCHAR(50),
    results JSONB
);

CREATE TABLE agent_transactions (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER REFERENCES apspan_agents(id),
    transaction_type VARCHAR(50),
    amount NUMERIC,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```