```sql
CREATE TABLE market_analysis_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE market_data_snapshots (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL,
    data JSONB NOT NULL,
    retrieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_analysis_results (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES market_analysis_users(id),
    analysis JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_analysis_history (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES market_analysis_users(id),
    analysis_id INT REFERENCES ai_analysis_results(id),
    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```