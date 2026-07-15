-- SYNOPSIS: Database migration — 003_create_credential_verification.sql.
CREATE TABLE IF NOT EXISTS credential_verification (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    verification_code VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    method TEXT,
    CONSTRAINT fk_user
        FOREIGN KEY(user_id) 
        REFERENCES users(id)
);