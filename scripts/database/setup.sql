```sql
-- Create table for code reviews
CREATE TABLE code_reviews (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for review comments
CREATE TABLE review_comments (
    id SERIAL PRIMARY KEY,
    review_id INT REFERENCES code_reviews(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    author VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for review assignments
CREATE TABLE review_assignments (
    id SERIAL PRIMARY KEY,
    review_id INT REFERENCES code_reviews(id) ON DELETE CASCADE,
    assigned_to VARCHAR(255) NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```