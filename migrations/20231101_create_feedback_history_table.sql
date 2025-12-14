```sql
CREATE TABLE feedback_history (
    id SERIAL PRIMARY KEY,
    code_review_id INTEGER REFERENCES code_reviews(id),
    feedback TEXT NOT NULL,
    severity VARCHAR(50),
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```