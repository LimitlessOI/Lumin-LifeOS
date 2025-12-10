```sql
CREATE TABLE code_submissions (
    submission_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    code TEXT NOT NULL,
    review_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE code_review_history (
    review_id SERIAL PRIMARY KEY,
    submission_id INT NOT NULL,
    analysis_result JSONB,
    reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES code_submissions(submission_id)
);
```