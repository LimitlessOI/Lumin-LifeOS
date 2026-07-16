-- SYNOPSIS: Idempotent migration to convert capsule_id text values to UUID v4 format.
-- @ssot docs/products/memory-system/PRODUCT_HOME.md

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'capsules') THEN
        RAISE EXCEPTION 'Table "capsules" does not exist';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'capsules'
        AND column_name = 'capsule_id'
        AND data_type = 'text'
    ) THEN
        -- Only rewrite rows that do not already look like a UUID v4 string
        UPDATE capsules
        SET capsule_id = gen_random_uuid()::text
        WHERE capsule_id IS NULL
           OR capsule_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

        ALTER TABLE capsules
        ALTER COLUMN capsule_id TYPE UUID
        USING (capsule_id::UUID);
    ELSE
        RAISE EXCEPTION 'Column "capsule_id" is not of type text or does not exist';
    END IF;
END $$;
