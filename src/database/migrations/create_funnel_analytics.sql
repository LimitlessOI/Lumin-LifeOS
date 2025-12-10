```sql
CREATE TABLE funnel_analytics (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    event_timestamp TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE funnel_aggregates (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    total_events INT DEFAULT 0,
    unique_users INT DEFAULT 0
);
```