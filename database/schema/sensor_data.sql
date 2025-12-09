```sql
CREATE TABLE sensor_data (
    id SERIAL PRIMARY KEY,
    project_id INT REFERENCES urban_projects(id),
    sensor_type VARCHAR(50),
    value NUMERIC,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```