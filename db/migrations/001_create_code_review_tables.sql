```sql
CREATE TABLE code_submissions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    code TEXT NOT NULL,
    language VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE code_reviews (
    id SERIAL PRIMARY KEY,
    submission_id INT REFERENCES code_submissions(id),
    reviewer_id INT NOT NULL,
    review_comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE review_revisions (
    id SERIAL PRIMARY KEY,
    review_id INT REFERENCES code_reviews(id),
    revision_comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reviewer_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    expertise TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```