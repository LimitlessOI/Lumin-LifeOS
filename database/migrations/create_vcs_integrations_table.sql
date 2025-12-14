```sql
CREATE TABLE vcs_integrations (
    id SERIAL PRIMARY KEY,
    vcs_type VARCHAR(50),
    repository VARCHAR(255),
    webhook_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);