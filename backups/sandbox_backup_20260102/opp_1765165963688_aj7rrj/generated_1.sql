-- File: database/migrations/2023_04_17_create_brand_strategists_table.sql
CREATE TABLE brand_strategists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    specialty TEXT,
    created_at TIMESTAMP WITHO0UT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHTOUT TIME ZONE
);