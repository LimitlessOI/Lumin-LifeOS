-- SYNOPSIS: Database migration — add_public_sacred_review_path.sql.
CREATE TABLE IF NOT EXISTS sacred_review_path (
    id SERIAL PRIMARY KEY,
    content_id INTEGER NOT NULL,
    reviewer_id INTEGER NOT NULL,
    review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    review_status VARCHAR(50) NOT NULL,
    comments TEXT,
    UNIQUE(content_id, reviewer_id)
);