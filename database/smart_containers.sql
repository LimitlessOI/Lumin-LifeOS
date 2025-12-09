```sql
CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE smart_containers (
    id SERIAL PRIMARY KEY,
    container_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('smart_containers', 'created_at');
```