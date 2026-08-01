-- SYNOPSIS: Database migration — addAdaptiveLayoutColumn.sql.
ALTER TABLE flourishing_prefs
ADD COLUMN adaptive_layout_column JSONB DEFAULT '{}';