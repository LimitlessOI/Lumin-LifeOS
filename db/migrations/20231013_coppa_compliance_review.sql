-- SYNOPSIS: Database migration — 20231013_coppa_compliance_review.sql.
-- Migration script: 20231013_coppa_compliance_review.sql

-- Check if the table already exists for idempotency
CREATE TABLE IF NOT EXISTS coppa_compliance_reviews (
    id SERIAL PRIMARY KEY,
    review_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewer VARCHAR(255) NOT NULL,
    compliance_status BOOLEAN NOT NULL,
    notes TEXT
);

-- Ensure that the table creation is logged appropriately
-- This is a placeholder for any logging mechanism you use (e.g., Sentry)
-- Placeholder: INSERT INTO behavior_logs (message) VALUES ('@ssot: Table coppa_compliance_reviews created successfully.');

-- Note: Replace the placeholder with actual logging code if necessary
