```sql
CREATE TABLE code_metrics (
    id SERIAL PRIMARY KEY,
    session_id INT REFERENCES code_sessions(id),
    action VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);