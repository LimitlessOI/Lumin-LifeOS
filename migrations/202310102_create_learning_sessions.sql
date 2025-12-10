```sql
CREATE TABLE IF NOT EXISTS learning_sessions (
    id SERIAL PRIMARY KEY,
    profile_id INT REFERENCES learning_profiles(id),
    session_data JSONB,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP
);