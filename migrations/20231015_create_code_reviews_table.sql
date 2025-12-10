```sql
CREATE TABLE code_reviews (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL,
    reviewer_name VARCHAR(255),
    status VARCHAR(50),
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
);