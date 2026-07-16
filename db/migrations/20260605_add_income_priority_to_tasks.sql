-- SYNOPSIS: Database migration — 20260605_add_income_priority_to_tasks.sql.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS income_priority INTEGER;
    ELSE
        RAISE NOTICE 'tasks table not present; skipping income_priority column.';
    END IF;
END $$;
