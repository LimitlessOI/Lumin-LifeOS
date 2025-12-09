```sql
CREATE TABLE impact_verifications (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) NOT NULL,
    verification_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE impact_tokens (
    id SERIAL PRIMARY KEY,
    token_id VARCHAR(255) UNIQUE NOT NULL,
    owner_id VARCHAR(255) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE resource_matches (
    id SERIAL PRIMARY KEY,
    resource_id VARCHAR(255) NOT NULL,
    match_data JSONB NOT NULL,
    matched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE arbitrage_bots (
    id SERIAL PRIMARY KEY,
    bot_name VARCHAR(255) NOT NULL,
    configuration JSONB,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);