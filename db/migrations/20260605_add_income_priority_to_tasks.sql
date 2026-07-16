-- SYNOPSIS: Database migration — 20260605_add_income_priority_to_tasks.sql.
ALTER TABLE tasks ADD COLUMN income_priority INTEGER;
