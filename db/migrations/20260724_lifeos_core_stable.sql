-- SYNOPSIS: Database migration — 20260724_lifeos_core_stable.sql.
-- @ssot docs/products/wellness-studio/PRODUCT_HOME.md
CREATE TABLE IF NOT EXISTS lifeos_core_stability_checks (
    id SERIAL PRIMARY KEY,
    check_name TEXT NOT NULL UNIQUE,
    stable BOOLEAN DEFAULT FALSE NOT NULL CHECK (stable IS TRUE),
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lifeos_core_stability_checks_check_name ON lifeos_core_stability_checks(check_name);