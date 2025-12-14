```sql
CREATE TABLE code_submissions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    code TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE code_reviews (
    id SERIAL PRIMARY KEY,
    submission_id INT REFERENCES code_submissions(id),
    reviewer_id INT NOT NULL,
    feedback TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```