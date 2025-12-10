```sql
CREATE TABLE IF NOT EXISTS micro_credentials (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    credential_data JSONB,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);