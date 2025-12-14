```sql
CREATE TABLE compliance_alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(255),
    description TEXT,
    severity INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```