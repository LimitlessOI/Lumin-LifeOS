-- SYNOPSIS: Database migration — 20260725_extend_wellness_tables.sql.
-- Extend joy_checkins table
ALTER TABLE joy_checkins
ADD COLUMN new_column_1 TYPE,  -- Replace TYPE with the appropriate data type
ADD COLUMN new_column_2 TYPE;  -- Add as many columns as needed

-- Extend integrity_score_log table
ALTER TABLE integrity_score_log
ADD COLUMN new_column_3 TYPE,
ADD COLUMN new_column_4 TYPE;

-- Extend wearable_data table
ALTER TABLE wearable_data
ADD COLUMN new_column_5 TYPE,
ADD COLUMN new_column_6 TYPE;

-- Extend emotional_patterns table
ALTER TABLE emotional_patterns
ADD COLUMN new_column_7 TYPE,
ADD COLUMN new_column_8 TYPE;

-- Make sure to replace new_column_X with actual column names and TYPE with actual data types.
-- Check for any existing column names to avoid conflicts.
