```sql
CREATE TABLE intervention_logs (
    id SERIAL PRIMARY KEY,
    session_id INT NOT NULL,
    intervention_action VARCHAR(255) NOT NULL,
    escalated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES mental_health_sessions(id)
);
```