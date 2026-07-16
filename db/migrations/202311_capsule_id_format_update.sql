-- SYNOPSIS: Database migration — 202311_capsule_id_format_update.sql.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'capsules'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'capsules' AND column_name = 'capsule_id' AND data_type = 'text'
    ) THEN
        UPDATE capsules
        SET capsule_id = gen_random_uuid()::text
        WHERE capsule_id IS NULL OR capsule_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

        ALTER TABLE capsules
        ALTER COLUMN capsule_id TYPE UUID USING capsule_id::UUID;
    END IF;
END $$;
