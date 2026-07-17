-- SYNOPSIS: Database migration — addAdaptiveLayoutColumn.sql.
CREATE TABLE IF NOT EXISTS flourishing_prefs (
    id SERIAL PRIMARY KEY,
    adaptive_layout BOOLEAN DEFAULT FALSE
);

