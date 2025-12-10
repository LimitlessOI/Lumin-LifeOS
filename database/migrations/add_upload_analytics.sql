CREATE TABLE upload_analytics (
    id SERIAL PRIMARY KEY,
    upload_id INT REFERENCES market_data_uploads(id),
    analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    result JSONB,
    status VARCHAR(50) DEFAULT 'pending'
);