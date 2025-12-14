```sql
CREATE TABLE code_submissions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    repository_url VARCHAR(255),
    branch_name VARCHAR(255),
    code TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE review_history (
    id SERIAL PRIMARY KEY,
    submission_id INT REFERENCES code_submissions(id),
    review_comments TEXT,
    reviewer_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vcs_integrations (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    vcs_type VARCHAR(50),
    access_token VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```