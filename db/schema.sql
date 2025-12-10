```sql
CREATE TABLE code_review_insights (
    id SERIAL PRIMARY KEY,
    review_id INT NOT NULL,
    insight_text TEXT NOT NULL,
    confidence_score DECIMAL(5, 2),
    type VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE insight_feedback (
    id SERIAL PRIMARY KEY,
    insight_id INT REFERENCES code_review_insights(id),
    user_id INT NOT NULL,
    feedback TEXT,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```