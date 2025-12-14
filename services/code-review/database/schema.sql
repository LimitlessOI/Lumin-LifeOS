CREATE TABLE code_reviews (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL,
    reviewer_id INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE review_analytics (
    id SERIAL PRIMARY KEY,
    review_id INT REFERENCES code_reviews(id),
    analysis_result JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);