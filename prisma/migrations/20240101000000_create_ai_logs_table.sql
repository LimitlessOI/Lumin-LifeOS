```sql
CREATE TABLE ai_logs (
    id SERIAL PRIMARY KEY,
    conversation_id INT NOT NULL,
    ai_response TEXT NOT NULL,
    confidence_score DECIMAL(5, 2),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
```