-- Create code_reviews table
CREATE TABLE code_reviews (
    id SERIAL PRIMARY KEY,
    review_date TIMESTAMP NOT NULL,
    reviewer_id INTEGER NOT NULL,
    code_base TEXT NOT NULL
);

-- Create review_findings table
CREATE TABLE review_findings (
    id SERIAL PRIMARY KEY,
    review_id INTEGER NOT NULL REFERENCES code_reviews(id),
    finding_description TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL
);

-- Create review_metrics table
CREATE TABLE review_metrics (
    id SERIAL PRIMARY KEY,
    review_id INTEGER NOT NULL REFERENCES code_reviews(id),
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC NOT NULL
);