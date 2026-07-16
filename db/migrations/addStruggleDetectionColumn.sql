-- SYNOPSIS: Database migration — addStruggleDetectionColumn.sql.
ALTER TABLE insurance_profiles ADD COLUMN IF NOT EXISTS struggle_detection VARCHAR;
