```sql
CREATE TABLE community_feedback (
    id SERIAL PRIMARY KEY,
    project_id INT REFERENCES urban_projects(id),
    feedback_text TEXT,
    sentiment_score NUMERIC,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```