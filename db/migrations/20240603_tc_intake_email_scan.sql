-- SYNOPSIS: Database migration — 20240603_tc_intake_email_scan.sql.
CREATE TABLE IF NOT EXISTS email_scan (
    id SERIAL PRIMARY KEY,
    email_address VARCHAR(255) NOT NULL,
    subject TEXT NOT NULL,
    body TEXT,
    received_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
