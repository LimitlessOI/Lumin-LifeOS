```sql
ALTER TABLE users ADD COLUMN account_tier VARCHAR(50);

CREATE TABLE code_submissions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    code TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE review_metrics (
    id SERIAL PRIMARY KEY,
    submission_id INT REFERENCES code_submissions(id),
    metric_name VARCHAR(100),
    value FLOAT,
    measured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```