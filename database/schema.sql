```sql
-- Schema for Credentials and Users

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS credentials (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    credential_data JSONB NOT NULL,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS did_documents (
    id SERIAL PRIMARY KEY,
    did VARCHAR(255) UNIQUE NOT NULL,
    document JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_user_id ON credentials(user_id);
CREATE INDEX idx_did ON did_documents(did);

-- Example function for logging
CREATE OR REPLACE FUNCTION log_activity() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO activity_log(table_name, action, timestamp)
    VALUES (TG_TABLE_NAME, TG_OP, CURRENT_TIMESTAMP);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger example for logging changes to users
CREATE TRIGGER log_user_changes
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION log_activity();
```