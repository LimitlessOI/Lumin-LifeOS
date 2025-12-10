```sql
CREATE TABLE analytics_events (
    event_id SERIAL PRIMARY KEY,
    event_type VARCHAR(50),
    event_details JSONB,
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```