```sql
CREATE TABLE container_lifecycle_events (
    id SERIAL PRIMARY KEY,
    container_id UUID NOT NULL,
    event_type VARCHAR(255),
    event_time TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('container_lifecycle_events', 'event_time');
```