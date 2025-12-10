```sql
CREATE TABLE code_submissions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    code TEXT NOT NULL,
    language VARCHAR(50) NOT NULL,
    result JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE review_templates (
    id SERIAL PRIMARY KEY,
    language VARCHAR(50) UNIQUE NOT NULL,
    template TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_code_stats (
    user_id INT PRIMARY KEY,
    submissions_count INT DEFAULT 0,
    last_submission TIMESTAMP
);
```