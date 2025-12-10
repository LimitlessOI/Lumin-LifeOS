```sql
CREATE TABLE IF NOT EXISTS learning_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    preferences JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);