-- SYNOPSIS: Database migration — add_public_sacred_review_path.sql.
CREATE TABLE IF NOT EXISTS sacred_review_path (
    id SERIAL PRIMARY KEY,
    content_id VARCHAR(255) NOT NULL UNIQUE,
    review_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    reviewer_id INTEGER,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sacred_review_path_content_id ON sacred_review_path (content_id);
CREATE INDEX IF NOT EXISTS idx_sacred_review_path_review_status ON sacred_review_path (review_status);
CREATE INDEX IF NOT EXISTS idx_sacred_review_path_reviewer_id ON sacred_review_path (reviewer_id);