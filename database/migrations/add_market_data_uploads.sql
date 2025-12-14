CREATE TABLE market_data_uploads (
    id SERIAL PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    user_id INT REFERENCES users(id),
    s3_key VARCHAR(255) NOT NULL
);