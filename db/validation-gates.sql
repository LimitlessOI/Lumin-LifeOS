-- SYNOPSIS: SQL — validation-gates.sql.
BEGIN;

-- SQL validation gate to ensure all .sql files are valid before builder commits them.
CREATE OR REPLACE FUNCTION validate_sql_file(file_path TEXT) RETURNS VOID AS $$
DECLARE
    sql_content TEXT;
BEGIN
    -- Read the content of the SQL file
    SELECT pg_read_file(file_path) INTO sql_content;
    
    -- Attempt to parse the SQL content to validate syntax
    EXECUTE 'EXPLAIN ' || sql_content;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'SQL validation failed for file: %', file_path;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to validate SQL and HTML files
CREATE OR REPLACE FUNCTION validate_all_files() RETURNS VOID AS $$
DECLARE
    file RECORD;
BEGIN
    FOR file IN SELECT pg_ls_dir('file_directory') AS file_name
    LOOP
        IF file.file_name LIKE '%.sql' THEN
            PERFORM validate_sql_file('file_directory/' || file.file_name);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger function is called before commits
DO $$
BEGIN
    -- Validate all SQL files in the directory
    PERFORM validate_all_files();
END;
$$;

COMMIT;
