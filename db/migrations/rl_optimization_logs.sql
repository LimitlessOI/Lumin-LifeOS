```sql
CREATE TABLE IF NOT EXISTS rl_optimization_logs (
    id SERIAL PRIMARY KEY,
    cycle_id UUID NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    status VARCHAR(50),
    performance_metrics JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```