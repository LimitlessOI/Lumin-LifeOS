```sql
-- Migration script to create necessary tables for the feature implementation

CREATE TABLE code_reviews (
    id SERIAL PRIMARY KEY,
    review_id VARCHAR(50) NOT NULL,
    repository_name VARCHAR(255),
    branch_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE code_issues (
    id SERIAL PRIMARY KEY,
    review_id VARCHAR(50) NOT NULL REFERENCES code_reviews(review_id),
    issue_description TEXT,
    severity VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_models (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(255) NOT NULL,
    version VARCHAR(50),
    language VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE review_metrics (
    id SERIAL PRIMARY KEY,
    review_id VARCHAR(50) NOT NULL REFERENCES code_reviews(review_id),
    metric_name VARCHAR(255),
    metric_value FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```