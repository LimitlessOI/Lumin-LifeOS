-- migration/2023_migration_1_create_keywords_table.sql
BEGIN;

CREATE TABLE IF NOT EXISTS keywords (
    id SERIAL PRIMARY KEY,
    keyword_text VARCHAR(255) UNIQUE NOT NULL
);

COMMIT;