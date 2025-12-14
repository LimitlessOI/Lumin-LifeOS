```sql
CREATE TABLE code_sessions (
    id SERIAL PRIMARY KEY,
    project_id INT REFERENCES code_projects(id),
    session_token VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);