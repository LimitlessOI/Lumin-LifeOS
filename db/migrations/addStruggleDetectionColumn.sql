-- SYNOPSIS: Database migration — addStruggleDetectionColumn.sql.
ALTER TABLE insurance_profiles ADD COLUMN struggle_detection VARCHAR;
