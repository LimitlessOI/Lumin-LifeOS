```sql
CREATE TABLE roi_metrics (
    id SERIAL PRIMARY KEY,
    process_id INTEGER NOT NULL,
    revenue NUMERIC(10, 2) NOT NULL,
    cost NUMERIC(10, 2) NOT NULL,
    roi_percentage NUMERIC(5, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_process_id ON roi_metrics (process_id);
```