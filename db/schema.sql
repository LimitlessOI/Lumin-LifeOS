```sql
CREATE TABLE impact_verifications (
    id SERIAL PRIMARY KEY,
    verification_data JSONB NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE impact_tokens (
    id SERIAL PRIMARY KEY,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    associated_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE resource_matches (
    id SERIAL PRIMARY KEY,
    resource_data JSONB NOT NULL,
    match_score DECIMAL(5, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cross_platform_reputations (
    id SERIAL PRIMARY KEY,
    platform_name VARCHAR(100) NOT NULL,
    reputation_score DECIMAL(5, 2) NOT NULL,
    user_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```