```sql
-- SQL script to create new tables for code review feature
CREATE TABLE code_review_submissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE code_review_files (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER REFERENCES code_review_submissions(id),
    filename VARCHAR(255),
    s3_key VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE code_review_comments (
    id SERIAL PRIMARY KEY,
    file_id INTEGER REFERENCES code_review_files(id),
    line_number INTEGER,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```