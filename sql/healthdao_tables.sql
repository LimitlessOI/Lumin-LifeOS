```sql
CREATE TABLE healthdao_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE healthdao_models (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES healthdao_users(id),
    model_data BYTEA NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE healthdao_data_contributions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES healthdao_users(id),
    contribution_data JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE healthdao_governance (
    id SERIAL PRIMARY KEY,
    proposal TEXT NOT NULL,
    votes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```