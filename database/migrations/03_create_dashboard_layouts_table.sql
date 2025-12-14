```sql
CREATE TABLE dashboard_layouts (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    layout JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```