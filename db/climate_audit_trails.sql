```sql
CREATE TABLE IF NOT EXISTS climate_audit_trails (
    id SERIAL PRIMARY KEY,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    user_id INT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```