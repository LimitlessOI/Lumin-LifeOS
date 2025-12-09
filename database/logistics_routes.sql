```sql
CREATE TABLE logistics_routes (
    id SERIAL PRIMARY KEY,
    route_id UUID NOT NULL,
    start_location VARCHAR(255),
    end_location VARCHAR(255),
    optimized_time TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('logistics_routes', 'optimized_time');
```