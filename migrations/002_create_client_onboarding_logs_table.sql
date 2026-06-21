-- SYNOPSIS: Database migration — 002_create_client_onboarding_logs_table.sql.
```sql
CREATE TABLE client_onboarding_logs (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id),
  status VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```