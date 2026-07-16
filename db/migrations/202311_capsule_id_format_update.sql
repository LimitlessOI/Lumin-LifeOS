-- SYNOPSIS: Database migration — 202311_capsule_id_format_update.sql.

-- Check if the `capsules` table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'capsules') THEN
        RAISE EXCEPTION 'Table "capsules" does not exist';
    END IF;
END $$;

-- Ensure the `capsule_id` column is of type `text` before changing it
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns 
        WHERE table_name = 'capsules' 
        AND column_name = 'capsule_id' 
        AND data_type = 'text'
    ) THEN
        -- Update existing capsule_id values to UUID v4 format
        UPDATE capsules
        SET capsule_id = gen_random_uuid()::text;

        -- Alter the column type to UUID
        ALTER TABLE capsules
        ALTER COLUMN capsule_id TYPE UUID
        USING (capsule_id::UUID);
    ELSE
        RAISE EXCEPTION 'Column "capsule_id" is not of type text or does not exist';
    END IF;
END $$;
