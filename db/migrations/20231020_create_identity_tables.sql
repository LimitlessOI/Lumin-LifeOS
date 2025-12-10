```sql
CREATE TABLE identity_verifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE identity_credentials (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE verification_sessions (
    id SERIAL PRIMARY KEY,
    verification_id INT REFERENCES identity_verifications(id),
    session_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);