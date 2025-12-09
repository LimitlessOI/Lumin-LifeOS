```sql
CREATE TABLE environment_cache (
    id SERIAL PRIMARY KEY,
    session_id UUID NOT NULL,
    environment_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);