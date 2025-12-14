```sql
CREATE TABLE sql_reviews (
    id SERIAL PRIMARY KEY,
    sql_content TEXT NOT NULL,
    analysis_results JSONB,
    best_practice_violations JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);