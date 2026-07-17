-- SYNOPSIS: SQL — memory-auto-apply.sql.
-- Ensure the auto_apply_tables setup is complete with the function and view.

-- Create the auto_apply_tables table if it does not exist
CREATE TABLE IF NOT EXISTS auto_apply_tables (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(255) UNIQUE NOT NULL,
    applied BOOLEAN NOT NULL DEFAULT FALSE
);

-- Create a view to check the application status of tables if it does not exist
CREATE VIEW IF NOT EXISTS auto_apply_status AS
SELECT
    table_name,
    applied
FROM
    auto_apply_tables;

-- Function to set tables as applied
CREATE OR REPLACE FUNCTION apply_tables() RETURNS VOID AS $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN SELECT table_name FROM auto_apply_tables WHERE NOT applied LOOP
        EXECUTE 'ALTER TABLE IF EXISTS ' || quote_ident(rec.table_name) || ' ADD COLUMN IF NOT EXISTS applied BOOLEAN DEFAULT FALSE';
        EXECUTE 'UPDATE auto_apply_tables SET applied = TRUE WHERE table_name = ' || quote_literal(rec.table_name);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Insert table and view names to auto-apply list, avoiding duplicates
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

-- Apply changes
SELECT apply_tables();
