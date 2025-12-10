CREATE TABLE code_review_projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE code_review_submissions (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL,
    reviewer_id INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    submission_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES code_review_projects(id)
);