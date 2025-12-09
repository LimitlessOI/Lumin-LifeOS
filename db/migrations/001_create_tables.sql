```sql
CREATE TABLE vrtourism_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vr_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES vrtourism_users(id),
    session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_end TIMESTAMP,
    status VARCHAR(20) NOT NULL
);

CREATE TABLE virtual_nfts (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES vrtourism_users(id),
    nft_data JSONB,
    minted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_locals (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    narrative_data JSONB
);

CREATE TABLE sensory_devices (
    id SERIAL PRIMARY KEY,
    device_type VARCHAR(50),
    user_id INT REFERENCES vrtourism_users(id),
    configuration JSONB
);