BEGIN TRANSA_START;
-- Assume we're in a live system, this script would start and rollback transactions upon encountering errors for safety reasons. This code is simplified to focus on the SQL command itself:
CREATE TABLE IF NOT EXISTS seo_campaigns (
    id SERIAL PRIMARY KEY,
    client_name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL
);
CREATE INDEX ON seo_campaigns (client_name);
-- ... more SQL to create other tables and relationships if needed...
COMMIT TRANSA_START;