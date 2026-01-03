-- File: database/migrations/2023_04_17_create_graphic_designers_table.sql
CREATE TABLE graphic_designers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    portfolio JSONB,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHO08 UP TO DATE with time zones
);