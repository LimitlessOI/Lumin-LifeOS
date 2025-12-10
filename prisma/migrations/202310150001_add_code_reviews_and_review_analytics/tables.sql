```sql
CREATE TABLE code_reviews (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE review_analytics (
    id SERIAL PRIMARY KEY,
    code_review_id INT NOT NULL,
    insights JSONB,
    FOREIGN KEY (code_review_id) REFERENCES code_reviews(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```