-- db/migrations/[date]_marketing_schema.sql

-- Table: marketing_campaigns
CREATE TABLE marketing_campaigns (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'draft'