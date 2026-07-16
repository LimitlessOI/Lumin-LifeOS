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

-- HTML validation gate to ensure all .html files are valid before builder commits them.
CREATE OR REPLACE FUNCTION validate_html_file(file_path TEXT) RETURNS VOID AS $$
DECLARE
    html_content TEXT;
BEGIN
    -- Read the content of the HTML file
    SELECT pg_read_file(file_path) INTO html_content;
    
    -- Simple validation example: Check for basic HTML structure
    IF NOT (html_content LIKE '%<html>%' AND html_content LIKE '%</html>%') THEN
        RAISE EXCEPTION 'HTML validation failed for file: %', file_path;
    END IF;
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
        ELSIF file.file_name LIKE '%.html' THEN
            PERFORM validate_html_file('file_directory/' || file.file_name);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger function is called before commits
DO $$
BEGIN
    -- List all the .sql and .html files in the directory and validate each
    PERFORM validate_all_files();
    RAISE NOTICE 'SQL_VALIDATION_GATE: All SQL files validated successfully.';
    RAISE NOTICE 'HTML_VALIDATION_GATE: All HTML files validated successfully.';
END;
$$;

COMMIT;
