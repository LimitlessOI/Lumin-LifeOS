```sql
CREATE TABLE route_metrics (
    id SERIAL PRIMARY KEY,
    route_id INT NOT NULL,
    request_count INT DEFAULT 0,
    error_count INT DEFAULT 0,
    last_accessed TIMESTAMP,
    FOREIGN KEY (route_id) REFERENCES generated_routes(id)
);