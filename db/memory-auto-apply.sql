-- SYNOPSIS: SQL — memory-auto-apply.sql.
CREATE TABLE IF NOT EXISTS auto_apply_tables (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(255) UNIQUE NOT NULL,
    applied BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE VIEW IF NOT EXISTS auto_apply_status AS
SELECT 
    table_name, 
    applied 
FROM 
    auto_apply_tables;

CREATE OR REPLACE FUNCTION apply_tables() RETURNS VOID AS $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN SELECT table_name FROM auto_apply_tables WHERE NOT applied LOOP
        EXECUTE 'ALTER TABLE IF EXISTS ' || rec.table_name || ' ADD COLUMN IF NOT EXISTS applied BOOLEAN DEFAULT FALSE';
        EXECUTE 'UPDATE auto_apply_tables SET applied = TRUE WHERE table_name = ' || quote_literal(rec.table_name);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT apply_tables();