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
    EXECUTE sql_content;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'SQL validation failed for file: %', file_path;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to validate SQL files
CREATE OR REPLACE FUNCTION validate_all_sql_files() RETURNS VOID AS $$
DECLARE
    file RECORD;
BEGIN
    FOR file IN SELECT pg_ls_dir('sql_directory') AS file_name
    LOOP
        PERFORM validate_sql_file('sql_directory/' || file.file_name);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger function is called before commits
DO $$
BEGIN
    -- List all the .sql files in the directory and validate each
    PERFORM validate_all_sql_files();
END;
$$;

COMMIT;