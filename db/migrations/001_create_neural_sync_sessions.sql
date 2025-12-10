```sql
CREATE TABLE neural_sync_sessions (
    id SERIAL PRIMARY KEY,
    session_id UUID NOT NULL,
    user_id INT NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP
);