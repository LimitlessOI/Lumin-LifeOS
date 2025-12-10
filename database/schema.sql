CREATE TABLE code_submissions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    code TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reviewers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    expertise VARCHAR(100) NOT NULL
);

CREATE TABLE code_review_queue (
    id SERIAL PRIMARY KEY,
    submission_id INT NOT NULL REFERENCES code_submissions(id),
    reviewer_id INT REFERENCES reviewers(id),
    status VARCHAR(20) NOT NULL DEFAULT 'queued',
    assigned_at TIMESTAMP
);