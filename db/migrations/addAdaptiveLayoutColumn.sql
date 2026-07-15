-- SYNOPSIS: Database migration — addAdaptiveLayoutColumn.sql.
CREATE TABLE IF NOT EXISTS flourishing_prefs (
    id SERIAL PRIMARY KEY
);

ALTER TABLE flourishing_prefs
ADD COLUMN IF NOT EXISTS adaptive_layout BOOLEAN DEFAULT FALSE;