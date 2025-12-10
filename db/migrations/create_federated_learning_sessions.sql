```sql
CREATE TABLE federated_learning_sessions (
    id SERIAL PRIMARY KEY,
    session_id UUID NOT NULL,
    model_version VARCHAR(50),
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP
);
```