```sql
CREATE TABLE teleportation_logs (
    id SERIAL PRIMARY KEY,
    session_id UUID NOT NULL,
    user_id INT NOT NULL,
    target_location JSONB NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);