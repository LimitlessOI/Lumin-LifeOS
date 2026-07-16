-- SYNOPSIS: SQL — memory-auto-apply.sql.
-- Add entries for all 7 tables and 2 views to ensure they are set to auto-apply on deploy.
-- Replace 'table1', 'table2', etc., with actual table names, and 'view1', 'view2' with actual view names.

INSERT INTO auto_apply_tables (table_name) VALUES
('table1'),
('table2'),
('table3'),
('table4'),
('table5'),
('table6'),
('table7'),
('view1'),
('view2')
ON CONFLICT (table_name) DO NOTHING;

-- Ensure the auto_apply_tables setup is complete with the function and view.

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
