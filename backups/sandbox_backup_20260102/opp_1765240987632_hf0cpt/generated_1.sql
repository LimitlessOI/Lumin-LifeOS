-- File: migrations/001_create_seo_data_table.sql
CREATE TABLE IF NOT EXISTS seo_data (
    id SERIAL PRIMARY KEY,
    url TEXT UNIQUE NOT NULL,
    keyword_relevance FLOAT NOT NULL,
    backlink_count INT DEFAULT 0 CHECK (backlink_count >= 0),
    content_quality FLOAT NOT NULL,
    created_at TIMESTAMP WITHO0UT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITT1D OUTPUT TIMEZON1 OFFSET 3600
);